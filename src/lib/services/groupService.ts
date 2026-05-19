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

    const { data: existingGroup } = await supabase
      .from("chat_groups")
      .select("id")
      .eq("name", sanitizedName)
      .is("deleted_at", null)
      .single();

    if (existingGroup) {
      throw new Error("Já existe um grupo com este nome");
    }

    const { data, error } = await supabase
      .from("chat_groups")
      .insert({
        name: sanitizedName,
        type: input.type,
        membership_criteria: input.membership_criteria || null,
        created_by: input.created_by,
      })
      .select()
      .single();

    if (error) {
      log.error("Erro ao criar grupo", { error, groupName: sanitizedName });
      throw new Error("Erro ao criar grupo");
    }

    return data as Group;
  }

  async deleteGroup(groupId: string, adminId: string): Promise<void> {
    const { data: group, error: fetchError } = await supabase
      .from("chat_groups")
      .select("id, deleted_at")
      .eq("id", groupId)
      .single();

    if (fetchError || !group) {
      throw new Error("Grupo não encontrado");
    }

    if (group.deleted_at) {
      throw new Error("Grupo já foi deletado");
    }

    const { error } = await supabase
      .from("chat_groups")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: adminId,
      })
      .eq("id", groupId);

    if (error) {
      log.error("Erro ao deletar grupo", { error, groupId, adminId });
      throw new Error("Erro ao deletar grupo");
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
    const { data: group, error: groupError } = await supabase
      .from("chat_groups")
      .select("type, deleted_at")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      throw new Error("Grupo não encontrado");
    }

    if (group.deleted_at) {
      throw new Error("Não é possível adicionar membros a um grupo deletado");
    }

    if (group.type !== "manual") {
      throw new Error("Apenas grupos manuais permitem adição manual de membros");
    }

    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      throw new Error("Usuário não encontrado");
    }

    const { data: existingMember } = await supabase
      .from("chat_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (existingMember) {
      throw new Error("Usuário já é membro deste grupo");
    }

    const { data, error } = await supabase
      .from("chat_group_members")
      .insert({
        group_id: groupId,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      log.error("Erro ao adicionar membro ao grupo", { error, groupId, userId });
      throw new Error("Erro ao adicionar membro ao grupo");
    }

    return data as GroupMember;
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    const { data: group, error: groupError } = await supabase
      .from("chat_groups")
      .select("type, deleted_at")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      throw new Error("Grupo não encontrado");
    }

    if (group.type !== "manual") {
      throw new Error("Apenas grupos manuais permitem remoção manual de membros");
    }

    const { error } = await supabase
      .from("chat_group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) {
      log.error("Erro ao remover membro do grupo", { error, groupId, userId });
      throw new Error("Erro ao remover membro do grupo");
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
      const { data, error } = await supabase.rpc("get_member_groups_optimized", {
        p_user_id: userId,
      });

      if (error) {
        log.error("Erro ao buscar grupos do membro", { error, userId });
        throw new Error("Erro ao carregar grupos");
      }

      if (!data || data.length === 0) {
        return [];
      }

      return (data as MemberGroupsOptimizedRow[]).map((row) => ({
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
