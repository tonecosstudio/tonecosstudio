// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type {
  Group,
  GroupDetails,
  CreateGroupInput,
  GroupMember,
  PaginatedMembers,
  Pagination,
  GroupMetrics,
} from "@/types/groups";
import {
  validateGroupName,
  validateGroupType,
  validateMembershipCriteria,
} from "@/types/groups";

/**
 * GroupService - Service for managing chat groups
 * 
 * NOTE: TypeScript errors about table names are expected until migrations are applied
 * and types are regenerated. The migrations exist in supabase/migrations/20260223000000_*.sql
 * 
 * To regenerate types after applying migrations:
 * npx supabase gen types typescript --project-id pabxpvqwtvbjaunjejud > src/integrations/supabase/types.ts
 */

export class GroupService {
  /**
   * Creates a new group with validation
   * Requirements: 1.1, 1.2, 1.3, 1.4
   */
  async createGroup(input: CreateGroupInput): Promise<Group> {
    // Validate group name
    const nameValidation = validateGroupName(input.name);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    // Validate group type
    const typeValidation = validateGroupType(input.type);
    if (!typeValidation.valid) {
      throw new Error(typeValidation.error);
    }

    // Validate membership criteria
    const criteriaValidation = validateMembershipCriteria(
      input.type,
      input.membership_criteria || null
    );
    if (!criteriaValidation.valid) {
      throw new Error(criteriaValidation.error);
    }

    // Check if group name already exists (excluding deleted groups)
    const { data: existingGroup } = await supabase
      .from("chat_groups")
      .select("id")
      .eq("name", input.name)
      .is("deleted_at", null)
      .single();

    if (existingGroup) {
      throw new Error("Já existe um grupo com este nome");
    }

    // Create the group
    const { data, error } = await supabase
      .from("chat_groups")
      .insert({
        name: input.name,
        type: input.type,
        membership_criteria: input.membership_criteria || null,
        created_by: input.created_by,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar grupo:", error);
      throw new Error("Erro ao criar grupo");
    }

    return data as Group;
  }

  /**
   * Soft deletes a group (marks as deleted but preserves data)
   * Requirements: 15.1, 15.2, 15.3
   */
  async deleteGroup(groupId: string, adminId: string): Promise<void> {
    // Check if group exists and is not already deleted
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

    // Soft delete the group
    const { error } = await supabase
      .from("chat_groups")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: adminId,
      })
      .eq("id", groupId);

    if (error) {
      console.error("Erro ao deletar grupo:", error);
      throw new Error("Erro ao deletar grupo");
    }
  }

  /**
   * Gets detailed information about a group including metrics
   * Requirements: 1.1, 1.2, 1.3, 1.4, 15.1, 15.2, 15.3
   */
  async getGroupDetails(groupId: string): Promise<GroupDetails> {
    // Fetch group data
    const { data: group, error: groupError } = await supabase
      .from("chat_groups")
      .select("*")
      .eq("id", groupId)
      .is("deleted_at", null)
      .single();

    if (groupError || !group) {
      throw new Error("Grupo não encontrado");
    }

    // Get member count
    const { count: memberCount, error: memberError } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (memberError) {
      console.error("Erro ao contar membros:", memberError);
      throw new Error("Erro ao carregar detalhes do grupo");
    }

    // Get message count
    const { count: messageCount, error: messageError } = await supabase
      .from("chat_group_messages")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (messageError) {
      console.error("Erro ao contar mensagens:", messageError);
      throw new Error("Erro ao carregar detalhes do grupo");
    }

    // Get last message timestamp
    const { data: lastMessage } = await supabase
      .from("chat_group_messages")
      .select("created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Calculate estimated view rate
    const estimatedViewRate = await this.calculateEstimatedViewRate(groupId);

    return {
      ...group,
      member_count: memberCount || 0,
      message_count: messageCount || 0,
      last_message_at: lastMessage?.created_at || null,
      estimated_view_rate: estimatedViewRate,
    } as GroupDetails;
  }

  /**
   * Lists all groups with optional includeDeleted parameter
   * Requirements: 1.1, 1.2, 1.3, 1.4, 15.1, 15.2, 15.3
   */
  async listGroups(includeDeleted: boolean = false): Promise<Group[]> {
    let query = supabase.from("chat_groups").select("*");

    // Filter out deleted groups unless includeDeleted is true
    if (!includeDeleted) {
      query = query.is("deleted_at", null);
    }

    // Order by created_at descending
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao listar grupos:", error);
      throw new Error("Erro ao carregar grupos");
    }

    return (data || []) as Group[];
  }

  /**
   * Adds a member to a manual group
   * Requirements: 2.1, 2.2, 2.3, 2.4
   */
  async addMember(groupId: string, userId: string): Promise<GroupMember> {
    // Verify group exists and is manual
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

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      throw new Error("Usuário não encontrado");
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("chat_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (existingMember) {
      // Return informative message instead of error
      throw new Error("Usuário já é membro deste grupo");
    }

    // Add member
    const { data, error } = await supabase
      .from("chat_group_members")
      .insert({
        group_id: groupId,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao adicionar membro:", error);
      throw new Error("Erro ao adicionar membro ao grupo");
    }

    return data as GroupMember;
  }

  /**
   * Removes a member from a manual group
   * Requirements: 3.1, 3.2, 3.3
   */
  async removeMember(groupId: string, userId: string): Promise<void> {
    // Verify group exists and is manual
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

    // Remove member
    const { error } = await supabase
      .from("chat_group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) {
      console.error("Erro ao remover membro:", error);
      throw new Error("Erro ao remover membro do grupo");
    }
  }

  /**
   * Lists members of a group with pagination
   * Requirements: 2.1, 2.2, 2.3, 2.4
   */
  async listMembers(
    groupId: string,
    pagination: Pagination = { page: 1, limit: 50 }
  ): Promise<PaginatedMembers> {
    const offset = (pagination.page - 1) * pagination.limit;

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (countError) {
      console.error("Erro ao contar membros:", countError);
      throw new Error("Erro ao carregar membros");
    }

    // Get paginated members
    const { data: members, error: membersError } = await supabase
      .from("chat_group_members")
      .select("user_id, joined_at, last_viewed_at")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: false })
      .range(offset, offset + pagination.limit - 1);

    if (membersError) {
      console.error("Erro ao listar membros:", membersError);
      throw new Error("Erro ao carregar membros");
    }

    // Get user profiles
    const userIds = members.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profilesMap = new Map(
      (profiles || []).map((p: any) => [p.id, p])
    );

    // Map members with user data
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

  /**
   * Gets metrics for a group
   * Requirements: 16.1, 16.2, 16.3, 16.4
   */
  async getGroupMetrics(groupId: string): Promise<GroupMetrics> {
    // Get total members
    const { count: totalMembers, error: memberError } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (memberError) {
      console.error("Erro ao contar membros:", memberError);
      throw new Error("Erro ao calcular métricas");
    }

    // Get total messages
    const { count: totalMessages, error: messageError } = await supabase
      .from("chat_group_messages")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (messageError) {
      console.error("Erro ao contar mensagens:", messageError);
      throw new Error("Erro ao calcular métricas");
    }

    // Calculate estimated view rate
    const estimatedViewRate = await this.calculateEstimatedViewRate(groupId);

    return {
      total_members: totalMembers || 0,
      total_messages: totalMessages || 0,
      estimated_view_rate: estimatedViewRate,
    };
  }

  /**
   * Calculates the estimated view rate for a group
   * View rate = % of members who viewed the group after the last message was sent
   * Requirements: 16.3, 16.4
   */
  private async calculateEstimatedViewRate(groupId: string): Promise<number> {
    // Get the last message timestamp
    const { data: lastMessage } = await supabase
      .from("chat_group_messages")
      .select("created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!lastMessage) {
      // No messages yet, return 0
      return 0;
    }

    // Get total member count
    const { count: totalMembers } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (!totalMembers || totalMembers === 0) {
      return 0;
    }

    // Count members who viewed after the last message
    const { count: viewedMembers } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId)
      .gt("last_viewed_at", lastMessage.created_at);

    const viewRate = ((viewedMembers || 0) / totalMembers) * 100;
    return Math.round(viewRate * 100) / 100; // Round to 2 decimal places
  }

    /**
     * Gets a group by ID
     * Requirements: 1.1, 1.2, 1.3, 1.4
     */
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

    /**
     * Gets all groups that a user is a member of
     * Returns groups with unread count and last message preview
     * Requirements: 13.1, 13.2, 13.3
     */
    async getMemberGroups(userId: string): Promise<MemberGroupView[]> {
      // Get all groups the user is a member of
      const { data: memberships, error: memberError } = await supabase
        .from("chat_group_members")
        .select("group_id, last_viewed_at")
        .eq("user_id", userId);

      if (memberError) {
        console.error("Erro ao buscar grupos do membro:", memberError);
        throw new Error("Erro ao carregar grupos");
      }

      if (!memberships || memberships.length === 0) {
        return [];
      }

      const groupIds = memberships.map((m) => m.group_id);

      // Get group details
      const { data: groups, error: groupError } = await supabase
        .from("chat_groups")
        .select("id, name, type")
        .in("id", groupIds)
        .is("deleted_at", null);

      if (groupError) {
        console.error("Erro ao buscar detalhes dos grupos:", groupError);
        throw new Error("Erro ao carregar grupos");
      }

      // Get last message for each group
      const groupViews: MemberGroupView[] = await Promise.all(
        (groups || []).map(async (group) => {
          const membership = memberships.find((m) => m.group_id === group.id);

          // Get last message
          const { data: lastMessage } = await supabase
            .from("chat_group_messages")
            .select("message, sender_id, created_at")
            .eq("group_id", group.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Get sender name if there's a last message
          let senderName = "";
          if (lastMessage) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", lastMessage.sender_id)
              .single();

            senderName = profile?.full_name || profile?.email || "Usuário";
          }

          // Calculate unread count
          let unreadCount = 0;
          if (membership?.last_viewed_at) {
            const { count } = await supabase
              .from("chat_group_messages")
              .select("*", { count: "exact", head: true })
              .eq("group_id", group.id)
              .gt("created_at", membership.last_viewed_at);

            unreadCount = count || 0;
          } else {
            // Never viewed, count all messages
            const { count } = await supabase
              .from("chat_group_messages")
              .select("*", { count: "exact", head: true })
              .eq("group_id", group.id);

            unreadCount = count || 0;
          }

          return {
            id: group.id,
            name: group.name,
            type: group.type as GroupType,
            unread_count: unreadCount,
            last_message: lastMessage
              ? {
                  message: lastMessage.message,
                  sender_name: senderName,
                  created_at: lastMessage.created_at,
                }
              : null,
            last_viewed_at: membership?.last_viewed_at || null,
          };
        })
      );

      // Sort by last message date (most recent first)
      return groupViews.sort((a, b) => {
        const aDate = a.last_message?.created_at || "0";
        const bDate = b.last_message?.created_at || "0";
        return bDate.localeCompare(aDate);
      });
    }
}

export const groupService = new GroupService();
