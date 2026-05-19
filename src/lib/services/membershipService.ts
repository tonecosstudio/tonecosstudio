import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import type { GroupMember, MembershipCriteria, PaginatedMembers, Pagination } from "@/types/groups";

interface UserIdRow {
  user_id: string;
}

interface ProfileIdRow {
  id: string;
}

/**
 * MembershipService - Service for managing group memberships.
 */
export class MembershipService {
  async addMember(groupId: string, userId: string): Promise<GroupMember> {
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

    return {
      members: members.map((member) => {
        const profile = profilesMap.get(member.user_id);

        return {
          user_id: member.user_id,
          user_name: profile?.full_name || profile?.email || "Usuário",
          user_email: profile?.email || "",
          joined_at: member.joined_at,
          last_viewed_at: member.last_viewed_at,
        };
      }),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: totalCount || 0,
        total_pages: Math.ceil((totalCount || 0) / pagination.limit),
      },
    };
  }

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

  async evaluateMembershipCriteria(criteria: MembershipCriteria, userId: string): Promise<boolean> {
    if (!criteria) {
      return false;
    }

    const matchingUsers = await this.getUsersMatchingCriteria(criteria);
    return matchingUsers.includes(userId);
  }

  async syncGroupMembership(groupId: string): Promise<{ added: number; removed: number }> {
    const { data: group, error: groupError } = await supabase
      .from("chat_groups")
      .select("type, membership_criteria")
      .eq("id", groupId)
      .is("deleted_at", null)
      .single();

    if (groupError || !group) {
      throw new Error("Grupo não encontrado");
    }

    if (group.type === "manual") {
      return { added: 0, removed: 0 };
    }

    const { data: currentMembers } = await supabase
      .from("chat_group_members")
      .select("user_id")
      .eq("group_id", groupId);

    const currentMemberIds = ((currentMembers || []) as UserIdRow[]).map(
      (member) => member.user_id
    );
    const expectedMemberIds = await this.getUsersMatchingCriteria(group.membership_criteria);

    const toAdd = expectedMemberIds.filter((id) => !currentMemberIds.includes(id));
    const toRemove = currentMemberIds.filter((id) => !expectedMemberIds.includes(id));

    if (toAdd.length > 0) {
      const { error: addError } = await supabase
        .from("chat_group_members")
        .insert(toAdd.map((memberId) => ({ group_id: groupId, user_id: memberId })));

      if (addError) {
        log.error("Erro ao adicionar membros na sincronização", {
          error: addError,
          groupId,
          count: toAdd.length,
        });
      }
    }

    if (toRemove.length > 0) {
      const { error: removeError } = await supabase
        .from("chat_group_members")
        .delete()
        .eq("group_id", groupId)
        .in("user_id", toRemove);

      if (removeError) {
        log.error("Erro ao remover membros na sincronização", {
          error: removeError,
          groupId,
          count: toRemove.length,
        });
      }
    }

    return {
      added: toAdd.length,
      removed: toRemove.length,
    };
  }

  private async getSubscriberUsers(criteria: {
    type: "assinantes";
    subscriptionStatus: "active";
    collectionId?: string;
    plan?: string;
  }): Promise<string[]> {
    let query = supabase.from("subscriptions").select("user_id").eq("status", "active");

    if (criteria.collectionId) {
      query = query.eq("collection_id", criteria.collectionId);
    }

    if (criteria.plan) {
      query = query.eq("plan_type", criteria.plan);
    }

    const { data, error } = await query;

    if (error) {
      log.error("Erro ao buscar assinantes", { error, criteria });
      return [];
    }

    return uniqueUserIds(data as UserIdRow[]);
  }

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
      log.error("Erro ao buscar assinantes da coleção", { error, criteria });
      return [];
    }

    return uniqueUserIds(data as UserIdRow[]);
  }

  private async getLaunchUsers(criteria: {
    type: "lancamentos";
    criteria: "all_users" | "previous_buyers";
  }): Promise<string[]> {
    if (criteria.criteria === "all_users") {
      const { data, error } = await supabase.from("profiles").select("id");

      if (error) {
        log.error("Erro ao buscar todos os usuários", { error });
        return [];
      }

      return (data as ProfileIdRow[]).map((profile) => profile.id);
    }

    const { data, error } = await supabase
      .from("orders")
      .select("user_id")
      .eq("status", "completed");

    if (error) {
      log.error("Erro ao buscar compradores anteriores", { error });
      return [];
    }

    return uniqueUserIds(data as UserIdRow[]);
  }

  private async getOrderUsers(criteria: {
    type: "pedidos";
    status?: string[];
    dateFrom?: string;
    dateTo?: string;
  }): Promise<string[]> {
    let query = supabase.from("orders").select("user_id");

    if (criteria.status && criteria.status.length > 0) {
      query = query.in("status", criteria.status);
    }

    if (criteria.dateFrom) {
      query = query.gte("created_at", criteria.dateFrom);
    }

    if (criteria.dateTo) {
      query = query.lte("created_at", criteria.dateTo);
    }

    const { data, error } = await query;

    if (error) {
      log.error("Erro ao buscar usuários com pedidos", { error, criteria });
      return [];
    }

    return uniqueUserIds(data as UserIdRow[]);
  }
}

function uniqueUserIds(rows: UserIdRow[]): string[] {
  return [...new Set(rows.map((row) => row.user_id))];
}

export const membershipService = new MembershipService();
