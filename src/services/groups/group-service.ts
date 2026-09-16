import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { log } from "@/lib/logger";
import { sanitizeGroupName } from "@/lib/utils/sanitize";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  assertCurrentUserId,
  requireAuthenticatedUserId,
  requireCurrentUserAdminAccess,
} from "@/services/auth/current-user";
import type {
  CreateGroupInput,
  Group,
  GroupDetails,
  GroupMember,
  GroupMetrics,
  GroupType,
  GroupWithMetrics,
  MemberGroupView,
  MembershipCriteria,
  PaginatedMembers,
  Pagination,
} from "@/types/groups";
import {
  GROUP_TYPES,
  validateGroupName,
  validateGroupType,
  validateMembershipCriteria,
} from "@/types/groups";

type ChatGroupRow = Database["public"]["Tables"]["chat_groups"]["Row"];
type ChatGroupMemberRow = Database["public"]["Tables"]["chat_group_members"]["Row"];

interface GroupMemberCountRow {
  group_id: string;
}

interface GroupMessageTimestampRow {
  group_id: string;
  created_at: string;
}

function requireGroupType(value: string): GroupType {
  if (!GROUP_TYPES.includes(value as GroupType)) {
    throw new Error(`Tipo de grupo invalido: ${value}`);
  }

  return value as GroupType;
}

function toMembershipCriteria(value: Json | null): MembershipCriteria {
  return value as MembershipCriteria;
}

function toGroup(row: ChatGroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    type: requireGroupType(row.type),
    membership_criteria: toMembershipCriteria(row.membership_criteria),
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by,
  };
}

function mapGroupAdminError(message: string | undefined, fallback: string): string {
  const value = message ?? "";
  if (value.includes("GROUP_NAME_EXISTS")) return "Ja existe um grupo com este nome";
  if (value.includes("GROUP_NOT_FOUND")) return "Grupo nao encontrado";
  if (value.includes("GROUP_ALREADY_DELETED")) return "Grupo ja foi deletado";
  if (value.includes("GROUP_USER_NOT_FOUND")) return "Usuario nao encontrado";
  if (value.includes("GROUP_MEMBER_EXISTS")) return "Usuario ja e membro deste grupo";
  if (value.includes("GROUP_MANUAL_MEMBERS_ONLY")) {
    return "Apenas grupos manuais permitem alteracao manual de membros";
  }
  if (value.includes("INVALID_GROUP_NAME")) return "Nome do grupo invalido";
  if (value.includes("INVALID_GROUP_TYPE")) return "Tipo de grupo invalido";
  if (value.includes("GROUP_CRITERIA_REQUIRED")) {
    return "Grupos automaticos devem ter criterios de associacao";
  }
  return fallback;
}

/**
 * GroupService - canonical chat group service.
 *
 * Browser reads stay under RLS. Administrative writes cross the authenticated
 * admin-rpc boundary instead of mutating authoritative tables directly.
 */
export class GroupService {
  async createGroup(input: CreateGroupInput): Promise<Group> {
    const adminId = await requireCurrentUserAdminAccess();
    if (input.created_by !== adminId) {
      throw new Error("Acesso negado ao administrador informado");
    }

    const sanitizedName = sanitizeGroupName(input.name);
    const nameValidation = validateGroupName(sanitizedName);
    if (!nameValidation.valid) throw new Error(nameValidation.error);

    const typeValidation = validateGroupType(input.type);
    if (!typeValidation.valid) throw new Error(typeValidation.error);

    const criteriaValidation = validateMembershipCriteria(
      input.type,
      input.membership_criteria || null,
    );
    if (!criteriaValidation.valid) throw new Error(criteriaValidation.error);

    try {
      const result = await callAdminRpc<ChatGroupRow>("admin_create_chat_group", {
        p_name: sanitizedName,
        p_type: input.type,
        p_membership_criteria: input.membership_criteria || null,
        p_created_by: input.created_by,
      });
      return toGroup(result);
    } catch (error) {
      log.error("Erro ao criar grupo", { error, groupName: sanitizedName });
      throw new Error(
        mapGroupAdminError(
          error instanceof Error ? error.message : undefined,
          "Erro ao criar grupo",
        ),
      );
    }
  }

  async deleteGroup(groupId: string, adminId: string): Promise<void> {
    const currentAdminId = await requireCurrentUserAdminAccess();
    if (adminId !== currentAdminId) {
      throw new Error("Acesso negado ao administrador informado");
    }

    try {
      await callAdminRpc("admin_soft_delete_chat_group", {
        p_group_id: groupId,
        p_deleted_by: adminId,
      });
    } catch (error) {
      log.error("Erro ao deletar grupo", { error, groupId, adminId });
      throw new Error(
        mapGroupAdminError(
          error instanceof Error ? error.message : undefined,
          "Erro ao deletar grupo",
        ),
      );
    }
  }

  async getGroupDetails(groupId: string): Promise<GroupDetails> {
    await requireCurrentUserAdminAccess();

    const { data: group, error: groupError } = await supabase
      .from("chat_groups")
      .select("*")
      .eq("id", groupId)
      .is("deleted_at", null)
      .single();

    if (groupError || !group) throw new Error("Grupo nao encontrado");

    const [memberResult, messageResult, lastMessageResult] = await Promise.all([
      supabase
        .from("chat_group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId),
      supabase
        .from("chat_group_messages")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId),
      supabase
        .from("chat_group_messages")
        .select("created_at")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    if (memberResult.error || messageResult.error || lastMessageResult.error) {
      log.error("Erro ao carregar detalhes do grupo", {
        groupId,
        memberError: memberResult.error,
        messageError: messageResult.error,
        lastMessageError: lastMessageResult.error,
      });
      throw new Error("Erro ao carregar detalhes do grupo");
    }

    const lastMessage = lastMessageResult.data?.[0] ?? null;

    return {
      ...toGroup(group),
      member_count: memberResult.count ?? 0,
      message_count: messageResult.count ?? 0,
      last_message_at: lastMessage?.created_at ?? null,
      estimated_view_rate: await this.calculateEstimatedViewRate(groupId),
    };
  }

  async listGroups(includeDeleted = false): Promise<Group[]> {
    await requireCurrentUserAdminAccess();

    let query = supabase.from("chat_groups").select("*");
    if (!includeDeleted) query = query.is("deleted_at", null);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      log.error("Erro ao listar grupos", { error, includeDeleted });
      throw new Error("Erro ao carregar grupos");
    }

    return (data ?? []).map(toGroup);
  }

  async listGroupsWithMetrics(includeDeleted = false): Promise<GroupWithMetrics[]> {
    await requireCurrentUserAdminAccess();

    let query = supabase.from("chat_groups").select("*");
    if (!includeDeleted) query = query.is("deleted_at", null);

    const { data: groups, error } = await query.order("created_at", { ascending: false });
    if (error) {
      log.error("Erro ao listar grupos com metricas", { error, includeDeleted });
      throw new Error("Erro ao carregar grupos");
    }
    if (!groups?.length) return [];

    const groupIds = groups.map((group) => group.id);
    const [memberCountsResult, messagesResult] = await Promise.all([
      supabase.from("chat_group_members").select("group_id").in("group_id", groupIds),
      supabase
        .from("chat_group_messages")
        .select("group_id, created_at")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false }),
    ]);

    if (memberCountsResult.error || messagesResult.error) {
      log.error("Erro ao carregar metricas dos grupos", {
        memberError: memberCountsResult.error,
        messageError: messagesResult.error,
      });
      throw new Error("Erro ao carregar grupos");
    }

    const memberCountMap = new Map<string, number>();
    (memberCountsResult.data as GroupMemberCountRow[] | null)?.forEach((member) => {
      memberCountMap.set(member.group_id, (memberCountMap.get(member.group_id) ?? 0) + 1);
    });

    const messageCountMap = new Map<string, number>();
    const lastMessageMap = new Map<string, string>();
    (messagesResult.data as GroupMessageTimestampRow[] | null)?.forEach((message) => {
      messageCountMap.set(message.group_id, (messageCountMap.get(message.group_id) ?? 0) + 1);
      if (!lastMessageMap.has(message.group_id)) {
        lastMessageMap.set(message.group_id, message.created_at);
      }
    });

    return groups.map((row) => ({
      ...toGroup(row),
      member_count: memberCountMap.get(row.id) ?? 0,
      message_count: messageCountMap.get(row.id) ?? 0,
      last_message_at: lastMessageMap.get(row.id) ?? null,
    }));
  }

  async addMember(groupId: string, userId: string): Promise<GroupMember> {
    await requireCurrentUserAdminAccess();

    try {
      return await callAdminRpc<ChatGroupMemberRow>("admin_add_chat_group_member", {
        p_group_id: groupId,
        p_user_id: userId,
      });
    } catch (error) {
      log.error("Erro ao adicionar membro ao grupo", { error, groupId, userId });
      throw new Error(
        mapGroupAdminError(
          error instanceof Error ? error.message : undefined,
          "Erro ao adicionar membro ao grupo",
        ),
      );
    }
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await requireCurrentUserAdminAccess();

    try {
      await callAdminRpc("admin_remove_chat_group_member", {
        p_group_id: groupId,
        p_user_id: userId,
      });
    } catch (error) {
      log.error("Erro ao remover membro do grupo", { error, groupId, userId });
      throw new Error(
        mapGroupAdminError(
          error instanceof Error ? error.message : undefined,
          "Erro ao remover membro do grupo",
        ),
      );
    }
  }

  async listMembers(
    groupId: string,
    pagination: Pagination = { page: 1, limit: 50 },
  ): Promise<PaginatedMembers> {
    await requireCurrentUserAdminAccess();

    const offset = (pagination.page - 1) * pagination.limit;
    const [countResult, membersResult] = await Promise.all([
      supabase
        .from("chat_group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId),
      supabase
        .from("chat_group_members")
        .select("user_id, joined_at, last_viewed_at")
        .eq("group_id", groupId)
        .order("joined_at", { ascending: false })
        .range(offset, offset + pagination.limit - 1),
    ]);

    if (countResult.error || membersResult.error) {
      log.error("Erro ao listar membros do grupo", {
        groupId,
        countError: countResult.error,
        membersError: membersResult.error,
      });
      throw new Error("Erro ao carregar membros");
    }

    const members = membersResult.data ?? [];
    const userIds = members.map((member) => member.user_id);
    const profilesResult = userIds.length
      ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
      : { data: [], error: null };

    if (profilesResult.error) {
      log.error("Erro ao carregar perfis dos membros", { error: profilesResult.error, groupId });
      throw new Error("Erro ao carregar membros");
    }

    const profilesMap = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));

    return {
      members: members.map((member) => {
        const profile = profilesMap.get(member.user_id);
        return {
          user_id: member.user_id,
          user_name: profile?.full_name || profile?.email || "Usuario",
          user_email: profile?.email || "",
          joined_at: member.joined_at,
          last_viewed_at: member.last_viewed_at,
        };
      }),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: countResult.count ?? 0,
        total_pages: Math.ceil((countResult.count ?? 0) / pagination.limit),
      },
    };
  }

  async getGroupMetrics(groupId: string): Promise<GroupMetrics> {
    await requireCurrentUserAdminAccess();

    const [memberResult, messageResult] = await Promise.all([
      supabase
        .from("chat_group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId),
      supabase
        .from("chat_group_messages")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId),
    ]);

    if (memberResult.error || messageResult.error) {
      log.error("Erro ao calcular metricas do grupo", {
        groupId,
        memberError: memberResult.error,
        messageError: messageResult.error,
      });
      throw new Error("Erro ao calcular metricas");
    }

    return {
      total_members: memberResult.count ?? 0,
      total_messages: messageResult.count ?? 0,
      estimated_view_rate: await this.calculateEstimatedViewRate(groupId),
    };
  }

  async getGroupById(groupId: string): Promise<Group> {
    await requireAuthenticatedUserId();

    const { data, error } = await supabase
      .from("chat_groups")
      .select("*")
      .eq("id", groupId)
      .is("deleted_at", null)
      .single();

    if (error || !data) throw new Error("Grupo nao encontrado");
    return toGroup(data);
  }

  async getMemberGroups(userId: string): Promise<MemberGroupView[]> {
    await assertCurrentUserId(userId);

    try {
      const { data: memberships, error: membershipError } = await supabase
        .from("chat_group_members")
        .select("group_id, last_viewed_at, joined_at")
        .eq("user_id", userId)
        .order("joined_at", { ascending: false });

      if (membershipError) throw membershipError;
      if (!memberships?.length) return [];

      const groupIds = memberships.map((membership) => membership.group_id);
      const { data: groupRows, error: groupError } = await supabase
        .from("chat_groups")
        .select("*")
        .in("id", groupIds)
        .is("deleted_at", null);

      if (groupError) throw groupError;

      const groupsById = new Map((groupRows ?? []).map((row) => [row.id, toGroup(row)]));
      const results = await Promise.all(
        memberships.map(async (membership): Promise<MemberGroupView | null> => {
          const group = groupsById.get(membership.group_id);
          if (!group) return null;

          let unreadQuery = supabase
            .from("chat_group_messages")
            .select("*", { count: "exact", head: true })
            .eq("group_id", membership.group_id);

          if (membership.last_viewed_at) {
            unreadQuery = unreadQuery.gt("created_at", membership.last_viewed_at);
          }

          const [lastMessageResult, unreadResult] = await Promise.all([
            supabase
              .from("chat_group_messages")
              .select("message, created_at")
              .eq("group_id", membership.group_id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            unreadQuery,
          ]);

          if (lastMessageResult.error || unreadResult.error) {
            throw lastMessageResult.error ?? unreadResult.error;
          }

          return {
            id: group.id,
            name: group.name,
            type: group.type,
            unread_count: unreadResult.count ?? 0,
            last_message: lastMessageResult.data
              ? {
                  message: lastMessageResult.data.message,
                  created_at: lastMessageResult.data.created_at,
                }
              : null,
            last_viewed_at: membership.last_viewed_at,
          };
        }),
      );

      return results.filter((group): group is MemberGroupView => group !== null);
    } catch (error) {
      log.error("Erro ao buscar grupos do membro", { error, userId });
      throw new Error("Erro ao carregar grupos");
    }
  }

  private async calculateEstimatedViewRate(groupId: string): Promise<number> {
    const { data: lastMessageData, error: lastMessageError } = await supabase
      .from("chat_group_messages")
      .select("created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (lastMessageError) throw lastMessageError;
    const lastMessage = lastMessageData?.[0] ?? null;
    if (!lastMessage) return 0;

    const [membersResult, viewedResult] = await Promise.all([
      supabase
        .from("chat_group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId),
      supabase
        .from("chat_group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId)
        .gt("last_viewed_at", lastMessage.created_at),
    ]);

    if (membersResult.error || viewedResult.error) {
      throw membersResult.error ?? viewedResult.error;
    }

    const totalMembers = membersResult.count ?? 0;
    if (totalMembers === 0) return 0;

    return Math.round((((viewedResult.count ?? 0) / totalMembers) * 100) * 100) / 100;
  }
}

export const groupService = new GroupService();
