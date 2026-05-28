import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { sanitizeGroupName } from "@/lib/utils/sanitize";
import type {
  CreateGroupInput,
  Group,
  GroupDetails,
  GroupMember,
  GroupMetrics,
  GroupType,
  GroupWithMetrics,
  MemberGroupView,
  PaginatedMembers,
  Pagination,
} from "@/types/groups";
import { validateGroupName, validateGroupType, validateMembershipCriteria } from "@/types/groups";

interface GroupMemberCountRow {
  group_id: string;
}

interface GroupMessageTimestampRow {
  group_id: string;
  created_at: string;
}

interface MemberGroupsOptimizedRow {
  group_id: string;
  group_name: string;
  group_type: GroupType;
  unread_count: number | string;
  last_message_text: string | null;
  last_message_sender_name: string | null;
  last_message_created_at: string | null;
  last_viewed_at: string | null;
}

type RpcError = { message?: string } | null;

interface GroupAdminRpcClient {
  rpc(functionName: "admin_create_chat_group", args: {
    p_name: string;
    p_type: string;
    p_membership_criteria: unknown;
    p_created_by: string;
  }): PromiseLike<{ data: unknown; error: RpcError }>;
  rpc(functionName: "admin_soft_delete_chat_group", args: {
    p_group_id: string;
    p_deleted_by: string;
  }): PromiseLike<{ data: unknown; error: RpcError }>;
  rpc(functionName: "admin_add_chat_group_member", args: {
    p_group_id: string;
    p_user_id: string;
  }): PromiseLike<{ data: unknown; error: RpcError }>;
  rpc(functionName: "admin_remove_chat_group_member", args: {
    p_group_id: string;
    p_user_id: string;
  }): PromiseLike<{ data: unknown; error: RpcError }>;
  rpc(functionName: "get_member_groups_optimized", args: {
    p_user_id: string;
  }): PromiseLike<{ data: MemberGroupsOptimizedRow[] | null; error: RpcError }>;
}

const groupAdminRpc = supabase as unknown as GroupAdminRpcClient;

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
 * GroupService - Service for managing chat groups.
 */
export class GroupService {
  async createGroup(input: CreateGroupInput): Promise<Group> {
    const sanitizedName = sanitizeGroupName(input.name);

    const nameValidation = validateGroupName(sanitizedName);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    const typeValidation = validateGroupType(input.type);
    if (!typeValidation.valid) {
      throw new Error(typeValidation.error);
    }

    const criteriaValidation = validateMembershipCriteria(
      input.type,
      input.membership_criteria || null
    );
    if (!criteriaValidation.valid) {
      throw new Error(criteriaValidation.error);
    }

    const { data, error } = await groupAdminRpc.rpc("admin_create_chat_group", {
      p_name: sanitizedName,
      p_type: input.type,
      p_membership_criteria: input.membership_criteria || null,
      p_created_by: input.created_by,
    });

    if (error) {
      log.error("Erro ao criar grupo", { error, groupName: sanitizedName });
      throw new Error(mapGroupAdminError(error.message, "Erro ao criar grupo"));
    }

    return data as Group;
  }

  async deleteGroup(groupId: string, adminId: string): Promise<void> {
    const { error } = await groupAdminRpc.rpc("admin_soft_delete_chat_group", {
      p_group_id: groupId,
      p_deleted_by: adminId,
    });

    if (error) {
      log.error("Erro ao deletar grupo", { error, groupId, adminId });
      throw new Error(mapGroupAdminError(error.message, "Erro ao deletar grupo"));
    }
  }

  async getGroupDetails(groupId: string): Promise<GroupDetails> {
    const { data: group, error: groupError } = await supabase
      .from("chat_groups")
      .select("*")
      .eq("id", groupId)
      .is("deleted_at", null)
      .single();

    if (groupError || !group) {
      throw new Error("Grupo não encontrado");
    }

    const { count: memberCount, error: memberError } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (memberError) {
      log.error("Erro ao contar membros do grupo", { error: memberError, groupId });
      throw new Error("Erro ao carregar detalhes do grupo");
    }

    const { count: messageCount, error: messageError } = await supabase
      .from("chat_group_messages")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (messageError) {
      log.error("Erro ao contar mensagens do grupo", { error: messageError, groupId });
      throw new Error("Erro ao carregar detalhes do grupo");
    }

    const { data: lastMessageData } = await supabase
      .from("chat_group_messages")
      .select("created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(1);

    const lastMessage = lastMessageData?.[0] || null;
    const estimatedViewRate = await this.calculateEstimatedViewRate(groupId);

    return {
      ...group,
      member_count: memberCount || 0,
      message_count: messageCount || 0,
      last_message_at: lastMessage?.created_at || null,
      estimated_view_rate: estimatedViewRate,
    } as GroupDetails;
  }

  async listGroups(includeDeleted: boolean = false): Promise<Group[]> {
    let query = supabase.from("chat_groups").select("*");

    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      log.error("Erro ao listar grupos", { error, includeDeleted });
      throw new Error("Erro ao carregar grupos");
    }

    return (data || []) as Group[];
  }

  async listGroupsWithMetrics(includeDeleted: boolean = false): Promise<GroupWithMetrics[]> {
    let query = supabase.from("chat_groups").select("*");

    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    const { data: groups, error } = await query.order("created_at", { ascending: false });

    if (error) {
      log.error("Erro ao listar grupos com métricas", { error, includeDeleted });
      throw new Error("Erro ao carregar grupos");
    }

    if (!groups || groups.length === 0) {
      return [];
    }

    const groupIds = groups.map((group) => group.id);

    const [memberCountsResult, messagesResult] = await Promise.all([
      supabase.from("chat_group_members").select("group_id").in("group_id", groupIds),
      supabase
        .from("chat_group_messages")
        .select("group_id, created_at")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false }),
    ]);

    const memberCountMap = new Map<string, number>();
    if (memberCountsResult.data) {
      (memberCountsResult.data as GroupMemberCountRow[]).forEach((member) => {
        memberCountMap.set(member.group_id, (memberCountMap.get(member.group_id) || 0) + 1);
      });
    }

    const messageCountMap = new Map<string, number>();
    const lastMessageMap = new Map<string, string>();
    if (messagesResult.data) {
      (messagesResult.data as GroupMessageTimestampRow[]).forEach((message) => {
        messageCountMap.set(message.group_id, (messageCountMap.get(message.group_id) || 0) + 1);

        if (!lastMessageMap.has(message.group_id)) {
          lastMessageMap.set(message.group_id, message.created_at);
        }
      });
    }

    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      type: group.type,
      membership_criteria: group.membership_criteria,
      created_by: group.created_by,
      created_at: group.created_at,
      updated_at: group.updated_at,
      deleted_at: group.deleted_at,
      deleted_by: group.deleted_by,
      member_count: memberCountMap.get(group.id) || 0,
      message_count: messageCountMap.get(group.id) || 0,
      last_message_at: lastMessageMap.get(group.id) || null,
    })) as GroupWithMetrics[];
  }

  async addMember(groupId: string, userId: string): Promise<GroupMember> {
    const { data, error } = await groupAdminRpc.rpc("admin_add_chat_group_member", {
      p_group_id: groupId,
      p_user_id: userId,
    });

    if (error) {
      log.error("Erro ao adicionar membro ao grupo", { error, groupId, userId });
      throw new Error(mapGroupAdminError(error.message, "Erro ao adicionar membro ao grupo"));
    }

    return data as GroupMember;
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    const { error } = await groupAdminRpc.rpc("admin_remove_chat_group_member", {
      p_group_id: groupId,
      p_user_id: userId,
    });

    if (error) {
      log.error("Erro ao remover membro do grupo", { error, groupId, userId });
      throw new Error(mapGroupAdminError(error.message, "Erro ao remover membro do grupo"));
    }
  }

  async listMembers(
    groupId: string,
    pagination: Pagination = { page: 1, limit: 50 }
  ): Promise<PaginatedMembers> {
    const offset = (pagination.page - 1) * pagination.limit;

    const { count: totalCount, error: countError } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (countError) {
      log.error("Erro ao contar membros do grupo", { error: countError, groupId });
      throw new Error("Erro ao carregar membros");
    }

    const { data: members, error: membersError } = await supabase
      .from("chat_group_members")
      .select("user_id, joined_at, last_viewed_at")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: false })
      .range(offset, offset + pagination.limit - 1);

    if (membersError) {
      log.error("Erro ao listar membros do grupo", { error: membersError, groupId });
      throw new Error("Erro ao carregar membros");
    }

    const userIds = members.map((member) => member.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profilesMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

    const membersWithData = members.map((member) => {
      const profile = profilesMap.get(member.user_id);

      return {
        user_id: member.user_id,
        user_name: profile?.full_name || profile?.email || "Usuário",
        user_email: profile?.email || "",
        joined_at: member.joined_at,
        last_viewed_at: member.last_viewed_at,
      };
    });

    return {
      members: membersWithData,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: totalCount || 0,
        total_pages: Math.ceil((totalCount || 0) / pagination.limit),
      },
    };
  }

  async getGroupMetrics(groupId: string): Promise<GroupMetrics> {
    const { count: totalMembers, error: memberError } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (memberError) {
      log.error("Erro ao contar membros do grupo", { error: memberError, groupId });
      throw new Error("Erro ao calcular métricas");
    }

    const { count: totalMessages, error: messageError } = await supabase
      .from("chat_group_messages")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (messageError) {
      log.error("Erro ao contar mensagens do grupo", { error: messageError, groupId });
      throw new Error("Erro ao calcular métricas");
    }

    const estimatedViewRate = await this.calculateEstimatedViewRate(groupId);

    return {
      total_members: totalMembers || 0,
      total_messages: totalMessages || 0,
      estimated_view_rate: estimatedViewRate,
    };
  }

  async getGroupById(groupId: string): Promise<Group> {
    const { data, error } = await supabase
      .from("chat_groups")
      .select("*")
      .eq("id", groupId)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      throw new Error("Grupo não encontrado");
    }

    return data as Group;
  }

  async getMemberGroups(userId: string): Promise<MemberGroupView[]> {
    try {
      const { data, error } = await groupAdminRpc.rpc("get_member_groups_optimized", {
        p_user_id: userId,
      });

      if (error) {
        log.error("Erro ao buscar grupos do membro", { error, userId });
        throw new Error("Erro ao carregar grupos");
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((row) => ({
        id: row.group_id,
        name: row.group_name,
        type: row.group_type,
        unread_count: Number(row.unread_count),
        last_message: row.last_message_text
          ? {
              message: row.last_message_text,
              sender_name: row.last_message_sender_name || "",
              created_at: row.last_message_created_at || "",
            }
          : null,
        last_viewed_at: row.last_viewed_at,
      }));
    } catch (error) {
      log.error("Erro ao buscar grupos do membro", { error, userId });
      throw new Error("Erro ao carregar grupos");
    }
  }

  private async calculateEstimatedViewRate(groupId: string): Promise<number> {
    const { data: lastMessageData } = await supabase
      .from("chat_group_messages")
      .select("created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(1);

    const lastMessage = lastMessageData?.[0] || null;

    if (!lastMessage) {
      return 0;
    }

    const { count: totalMembers } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (!totalMembers || totalMembers === 0) {
      return 0;
    }

    const { count: viewedMembers } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId)
      .gt("last_viewed_at", lastMessage.created_at);

    const viewRate = ((viewedMembers || 0) / totalMembers) * 100;
    return Math.round(viewRate * 100) / 100;
  }
}

export const groupService = new GroupService();
