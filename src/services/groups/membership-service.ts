import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { callAdminRpc } from "@/services/admin/admin-rpc-gateway";
import { requireCurrentUserAdminAccess } from "@/services/auth/current-user";
import type {
  GroupMember,
  MembershipCriteria,
  PaginatedMembers,
  Pagination,
} from "@/types/groups";

interface UserIdRow {
  user_id: string;
}

interface ProfileIdRow {
  id: string;
}

function mapMembershipError(
  message: string | undefined,
  fallback: string,
): string {
  const value = message ?? "";
  if (value.includes("GROUP_NOT_FOUND")) return "Grupo nao encontrado";
  if (value.includes("GROUP_USER_NOT_FOUND")) return "Usuario nao encontrado";
  if (value.includes("GROUP_MEMBER_EXISTS"))
    return "Usuario ja e membro deste grupo";
  if (value.includes("GROUP_MANUAL_MEMBERS_ONLY")) {
    return "Apenas grupos manuais permitem alteracao manual de membros";
  }
  return fallback;
}

/**
 * MembershipService - Service for managing group memberships.
 */
export class MembershipService {
  async addMember(groupId: string, userId: string): Promise<GroupMember> {
    await requireCurrentUserAdminAccess();

    try {
      return await callAdminRpc<GroupMember>("admin_add_chat_group_member", {
        p_group_id: groupId,
        p_user_id: userId,
      });
    } catch (error) {
      log.error("Erro ao adicionar membro ao grupo", {
        error,
        groupId,
        userId,
      });
      throw new Error(
        mapMembershipError(
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
        mapMembershipError(
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

    const { count: totalCount, error: countError } = await supabase
      .from("chat_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (countError) {
      log.error("Erro ao contar membros do grupo", {
        error: countError,
        groupId,
      });
      throw new Error("Erro ao carregar membros");
    }

    const { data: members, error: membersError } = await supabase
      .from("chat_group_members")
      .select("user_id, joined_at, last_viewed_at")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: false })
      .range(offset, offset + pagination.limit - 1);

    if (membersError) {
      log.error("Erro ao listar membros do grupo", {
        error: membersError,
        groupId,
      });
      throw new Error("Erro ao carregar membros");
    }

    const userIds = members.map((member) => member.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profilesMap = new Map(
      (profiles || []).map((profile) => [profile.id, profile]),
    );

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

  async getUsersMatchingCriteria(
    criteria: MembershipCriteria,
  ): Promise<string[]> {
    await requireCurrentUserAdminAccess();

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

  async evaluateMembershipCriteria(
    criteria: MembershipCriteria,
    userId: string,
  ): Promise<boolean> {
    await requireCurrentUserAdminAccess();

    if (!criteria) {
      return false;
    }

    const matchingUsers = await this.getUsersMatchingCriteria(criteria);
    return matchingUsers.includes(userId);
  }

  private async getSubscriberUsers(criteria: {
    type: "assinantes";
    subscriptionStatus: "active";
    collectionId?: string;
    plan?: string;
  }): Promise<string[]> {
    let query = supabase
      .from("subscriptions")
      .select("user_id")
      .eq("status", "active");

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
      .from("manual_payments")
      .select("user_id")
      .eq("status", "approved");

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
    let query = supabase
      .from("manual_payments")
      .select("user_id, status, created_at");

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
