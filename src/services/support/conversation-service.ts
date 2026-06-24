import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { sanitizePostgrestSearchTerm } from "@/lib/postgrest-search";
import {
  fetchSupportUnreadCountMap,
  hydrateSupportConversation,
  hydrateSupportConversations,
  type SupportConversationRow,
} from "@/services/support/support-conversation-hydration-service";
import {
  createSupportConversationRpc,
  updateSupportConversationRpc,
} from "@/services/support/support-conversation-mutations-service";
import type {
  Conversation,
  ConversationFilters,
  ConversationStatus,
  ConversationTag,
  CreateConversationData,
  PaginationOptions,
  RiskFlag,
} from "@/types/support";
export class ConversationService {
  /**
   * Lista conversas com filtros e ordenacao
   */
  async listConversations(
    filters?: ConversationFilters,
    pagination?: PaginationOptions
  ): Promise<Conversation[]> {
    let query = supabase.from("support_conversations").select("*");

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains("tags", filters.tags);
    }

    if (filters?.risk_flags && filters.risk_flags.length > 0) {
      query = query.contains("risk_flags", filters.risk_flags);
    }

    if (filters?.assigned_to) {
      query = query.eq("assigned_to", filters.assigned_to);
    }

    if (filters?.search) {
      const search = sanitizePostgrestSearchTerm(filters.search);
      if (search) {
        query = query.or(`subject.ilike.%${search}%,id.ilike.%${search}%`);
      }
    }

    const orderBy = pagination?.order_by || "last_message_at";
    const orderDirection = pagination?.order_direction || "desc";
    query = query.order(orderBy, { ascending: orderDirection === "asc" });

    if (pagination?.limit) {
      query = query.limit(pagination.limit);
    }
    if (pagination?.offset) {
      query = query.range(pagination.offset, pagination.offset + (pagination.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      log.error("Erro ao listar conversas", { error, filters, pagination });
      throw new Error("Erro ao carregar conversas");
    }

    return hydrateSupportConversations((data ?? []) as SupportConversationRow[], "admin");
  }

  /**
   * Obtem uma conversa especifica por ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from("support_conversations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      log.error("Erro ao buscar conversa", { error, conversationId: id });
      throw new Error("Erro ao carregar conversa");
    }

    if (!data) return null;

    return hydrateSupportConversation(data as SupportConversationRow, "admin");
  }

  /**
   * Cria uma nova conversa
   */
  async createConversation(conversationData: CreateConversationData): Promise<Conversation> {
    try {
      const conversation = await createSupportConversationRpc({
        userId: conversationData.user_id,
        subject: conversationData.subject,
        status: conversationData.status || "new",
        priority: conversationData.priority || "normal",
        tags: conversationData.tags || [],
        orderId: conversationData.order_id ?? null,
        quoteId: conversationData.quote_id ?? null,
        subscriptionId: conversationData.subscription_id ?? null,
        paymentId: conversationData.payment_id ?? null,
      });

      return hydrateSupportConversation(conversation as SupportConversationRow, "admin");
    } catch (error) {
      log.error("Erro ao criar conversa", { error, conversationData });
      throw new Error("Erro ao criar conversa");
    }
  }

  /**
   * Atualiza o status de uma conversa
   */
  async updateStatus(id: string, status: ConversationStatus): Promise<Conversation> {
    try {
      const conversation = await updateSupportConversationRpc(id, { status });
      return hydrateSupportConversation(conversation as SupportConversationRow, "admin");
    } catch (error) {
      log.error("Erro ao atualizar status", { error, conversationId: id, status });
      throw new Error("Erro ao atualizar status");
    }
  }

  /**
   * Atualiza as tags de uma conversa
   */
  async updateTags(id: string, tags: ConversationTag[]): Promise<Conversation> {
    try {
      const conversation = await updateSupportConversationRpc(id, { tags });
      return hydrateSupportConversation(conversation as SupportConversationRow, "admin");
    } catch (error) {
      log.error("Erro ao atualizar tags", { error, conversationId: id, tags });
      throw new Error("Erro ao atualizar tags");
    }
  }

  /**
   * Atualiza as flags de risco de uma conversa
   */
  async updateRiskFlags(id: string, risk_flags: RiskFlag[]): Promise<Conversation> {
    try {
      const conversation = await updateSupportConversationRpc(id, { risk_flags });
      return hydrateSupportConversation(conversation as SupportConversationRow, "admin");
    } catch (error) {
      log.error("Erro ao atualizar flags de risco", {
        error,
        conversationId: id,
        risk_flags,
      });
      throw new Error("Erro ao atualizar flags de risco");
    }
  }

  /**
   * Atualiza a data prometida de uma conversa
   */
  async updatePromisedDate(id: string, promised_date: string | null): Promise<Conversation> {
    try {
      const conversation = await updateSupportConversationRpc(id, { promised_date });
      return hydrateSupportConversation(conversation as SupportConversationRow, "admin");
    } catch (error) {
      log.error("Erro ao atualizar data prometida", {
        error,
        conversationId: id,
        promised_date,
      });
      throw new Error("Erro ao atualizar data prometida");
    }
  }

  /**
   * Busca conversas por termo de busca
   */
  async searchConversations(searchTerm: string): Promise<Conversation[]> {
    const search = sanitizePostgrestSearchTerm(searchTerm);
    if (!search) return [];

    const { data, error } = await supabase
      .from("support_conversations")
      .select("*")
      .or(`subject.ilike.%${search}%,id.ilike.%${search}%`)
      .order("last_message_at", { ascending: false });

    if (error) {
      log.error("Erro ao buscar conversas", { error, searchTerm });
      throw new Error("Erro ao buscar conversas");
    }

    return hydrateSupportConversations((data ?? []) as SupportConversationRow[], "admin");
  }

  /**
   * Conta mensagens nao lidas em uma conversa
   */
  async getUnreadCount(conversationId: string, viewerType: "customer" | "admin"): Promise<number> {
    const unreadCountMap = await fetchSupportUnreadCountMap([conversationId], viewerType);
    return unreadCountMap.get(conversationId) ?? 0;
  }
}

export const conversationService = new ConversationService();
