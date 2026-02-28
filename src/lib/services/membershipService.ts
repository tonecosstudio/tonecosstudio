import { supabase } from "@/integrations/supabase/client";
import type { GroupMember, MembershipCriteria, Pagination, PaginatedMembers } from "@/types/groups";

/**
 * MembershipService - Service for managing group memberships
 *
 * Handles:
 * - Adding/removing members from manual groups
 * - Evaluating membership criteria for automatic groups
 * - Listing members with pagination
 * - Finding users matching criteria for auto-sync
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.3, 5.3, 6.2, 6.3, 7.4, 17.2, 17.3, 17.4
 */

export class MembershipService {
  /**
   * Adds a member to a group with duplicate prevention
   * Requirements: 2.1, 2.2, 2.3, 2.4
   */
  async addMember(groupId: string, userId: string): Promise<GroupMember> {
    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      throw new Error("Usuário não encontrado");
    }

    // Check if user is already a member (duplicate prevention)
    const { data: existingMember } = await supabase
      .from("chat_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (existingMember) {
      // Return informative message instead of error (idempotent behavior)
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
   * Removes a member from a group (preserves message history)
   * Requirements: 3.1, 3.2, 3.3
   */
  async removeMember(groupId: string, userId: string): Promise<void> {
    // Remove member (message history is preserved via CASCADE behavior)
    const { error } = await supabase
      .from("chat_group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) {
      console.error("Erro ao remover membro:", error);
      throw new Error("Erro ao remover membro do grupo");
    }

    // Note: Message history is preserved in chat_group_messages table
    // The member simply loses access to view future messages
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

    const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

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
   * Gets all users matching the specified membership criteria
   * Used by auto-sync job to determine group membership
   * Requirements: 4.3, 5.3, 6.2, 6.3, 7.4, 17.2, 17.3, 17.4
   */
  async getUsersMatchingCriteria(criteria: MembershipCriteria): Promise<string[]> {
    if (!criteria) {
      return [];
    }

    switch (criteria.type) {
      case "assinantes":
        return this.getSubscriberUsers(criteria);

      case "colecao":
        return this.getCollectionSubscribers(criteria);

      case "lancamentos":
        return this.getLaunchUsers(criteria);

      case "pedidos":
        return this.getOrderUsers(criteria);

      default:
        return [];
    }
  }

  /**
   * Gets users with active subscriptions matching criteria
   * Requirements: 4.1, 4.2, 4.3
   */
  private async getSubscriberUsers(criteria: {
    type: "assinantes";
    subscriptionStatus: "active";
    collectionId?: string;
    plan?: string;
  }): Promise<string[]> {
    let query = supabase.from("subscriptions").select("user_id").eq("status", "active");

    // Optional filter by collection
    if (criteria.collectionId) {
      query = query.eq("collection_id", criteria.collectionId);
    }

    // Optional filter by plan
    if (criteria.plan) {
      query = query.eq("plan_type", criteria.plan);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar assinantes:", error);
      return [];
    }

    // Return unique user IDs
    return [...new Set(data.map((s: any) => s.user_id))];
  }

  /**
   * Gets users subscribed to a specific collection
   * Requirements: 5.1, 5.2, 5.3
   */
  private async getCollectionSubscribers(criteria: {
    type: "colecao";
    collectionId: string;
  }): Promise<string[]> {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("collection_id", criteria.collectionId)
      .eq("status", "active");

    if (error) {
      console.error("Erro ao buscar assinantes da coleção:", error);
      return [];
    }

    return [...new Set(data.map((s: any) => s.user_id))];
  }

  /**
   * Gets users for launch groups (all users or previous buyers)
   * Requirements: 6.1, 6.2, 6.3
   */
  private async getLaunchUsers(criteria: {
    type: "lancamentos";
    criteria: "all_users" | "previous_buyers";
  }): Promise<string[]> {
    if (criteria.criteria === "all_users") {
      // Get all registered users
      const { data, error } = await supabase.from("profiles").select("id");

      if (error) {
        console.error("Erro ao buscar todos os usuários:", error);
        return [];
      }

      return data.map((p: any) => p.id);
    } else {
      // Get users with completed orders
      const { data, error } = await supabase
        .from("orders")
        .select("user_id")
        .eq("status", "completed");

      if (error) {
        console.error("Erro ao buscar compradores anteriores:", error);
        return [];
      }

      return [...new Set(data.map((o: any) => o.user_id))];
    }
  }

  /**
   * Gets users with orders matching status and date criteria
   * Requirements: 7.1, 7.2, 7.3, 7.4
   */
  private async getOrderUsers(criteria: {
    type: "pedidos";
    status?: string[];
    dateFrom?: string;
    dateTo?: string;
  }): Promise<string[]> {
    let query = supabase.from("orders").select("user_id");

    // Filter by status if provided
    if (criteria.status && criteria.status.length > 0) {
      query = query.in("status", criteria.status);
    }

    // Filter by date range if provided
    if (criteria.dateFrom) {
      query = query.gte("created_at", criteria.dateFrom);
    }
    if (criteria.dateTo) {
      query = query.lte("created_at", criteria.dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar usuários com pedidos:", error);
      return [];
    }

    return [...new Set(data.map((o: any) => o.user_id))];
  }

  /**
   * Evaluates if a specific user matches the membership criteria
   * Used for validation and testing
   * Requirements: 4.3, 5.3, 6.2, 6.3, 7.4
   */
  async evaluateMembershipCriteria(criteria: MembershipCriteria, userId: string): Promise<boolean> {
    if (!criteria) {
      return false;
    }

    const matchingUsers = await this.getUsersMatchingCriteria(criteria);
    return matchingUsers.includes(userId);
  }

  /**
   * Syncs membership for a specific group based on its criteria
   * Adds new members and removes members who no longer match
   * Requirements: 17.2, 17.3, 17.4
   */
  async syncGroupMembership(groupId: string): Promise<{
    added: number;
    removed: number;
  }> {
    // Get group with criteria
    const { data: group, error: groupError } = await supabase
      .from("chat_groups")
      .select("type, membership_criteria")
      .eq("id", groupId)
      .is("deleted_at", null)
      .single();

    if (groupError || !group) {
      throw new Error("Grupo não encontrado");
    }

    // Skip manual groups
    if (group.type === "manual") {
      return { added: 0, removed: 0 };
    }

    // Get current members
    const { data: currentMembers } = await supabase
      .from("chat_group_members")
      .select("user_id")
      .eq("group_id", groupId);

    const currentMemberIds = (currentMembers || []).map((m: any) => m.user_id);

    // Get expected members based on criteria
    const expectedMemberIds = await this.getUsersMatchingCriteria(group.membership_criteria);

    // Calculate additions and removals
    const toAdd = expectedMemberIds.filter((id) => !currentMemberIds.includes(id));
    const toRemove = currentMemberIds.filter((id) => !expectedMemberIds.includes(id));

    // Add new members
    if (toAdd.length > 0) {
      const { error: addError } = await supabase
        .from("chat_group_members")
        .insert(toAdd.map((userId) => ({ group_id: groupId, user_id: userId })));

      if (addError) {
        console.error("Erro ao adicionar membros na sincronização:", addError);
      }
    }

    // Remove invalid members (they lose ALL access including history)
    if (toRemove.length > 0) {
      const { error: removeError } = await supabase
        .from("chat_group_members")
        .delete()
        .eq("group_id", groupId)
        .in("user_id", toRemove);

      if (removeError) {
        console.error("Erro ao remover membros na sincronização:", removeError);
      }
    }

    return {
      added: toAdd.length,
      removed: toRemove.length,
    };
  }
}

export const membershipService = new MembershipService();
