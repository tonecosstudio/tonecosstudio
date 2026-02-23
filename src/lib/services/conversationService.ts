// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type {
  Conversation,
  ConversationFilters,
  ConversationStatus,
  ConversationPriority,
  ConversationTag,
  RiskFlag,
  CreateConversationData,
  PaginationOptions,
} from "@/types/support";

export class ConversationService {
  /**
   * Lista conversas com filtros e ordenação
   */
  async listConversations(
    filters?: ConversationFilters,
    pagination?: PaginationOptions
  ): Promise<Conversation[]> {
    let query = supabase
      .from("support_conversations")
      .select("*");

    // Aplicar filtros
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
      // Busca por subject ou ID da conversa
      query = query.or(
        `subject.ilike.%${filters.search}%,id.ilike.%${filters.search}%`
      );
    }

    // Aplicar ordenação
    const orderBy = pagination?.order_by || "last_message_at";
    const orderDirection = pagination?.order_direction || "desc";
    query = query.order(orderBy, { ascending: orderDirection === "asc" });

    // Aplicar paginação
    if (pagination?.limit) {
      query = query.limit(pagination.limit);
    }
    if (pagination?.offset) {
      query = query.range(
        pagination.offset,
        pagination.offset + (pagination.limit || 50) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao listar conversas:", error);
      throw new Error("Erro ao carregar conversas");
    }

    // Buscar dados dos usuários
    const userIds = [...new Set((data || []).map((conv: any) => conv.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profilesMap = new Map(
      (profiles || []).map((p: any) => [p.id, p])
    );

    // Mapear conversas com dados do usuário
    return (data || []).map((conv: any) => {
      const profile = profilesMap.get(conv.user_id);
      return {
        ...conv,
        status: conv.status as ConversationStatus,
        priority: conv.priority as ConversationPriority,
        user_name: profile?.full_name || profile?.email || "Usuário",
        user_email: profile?.email || "",
        risk_flags: (conv.risk_flags || []) as RiskFlag[],
        tags: (conv.tags || []) as ConversationTag[],
      };
    });
  }

  /**
   * Obtém uma conversa específica por ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from("support_conversations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Erro ao buscar conversa:", error);
      throw new Error("Erro ao carregar conversa");
    }

    if (!data) return null;

    // Buscar dados do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.user_id)
      .single();

    return {
      ...data,
      status: data.status as ConversationStatus,
      priority: data.priority as ConversationPriority,
      user_name: profile?.full_name || profile?.email || "Usuário",
      user_email: profile?.email || "",
      risk_flags: (data.risk_flags || []) as RiskFlag[],
      tags: (data.tags || []) as ConversationTag[],
    };
  }

  /**
   * Cria uma nova conversa
   */
  async createConversation(
    conversationData: CreateConversationData
  ): Promise<Conversation> {
    const { data, error } = await supabase
      .from("support_conversations")
      .insert({
        user_id: conversationData.user_id,
        subject: conversationData.subject,
        status: conversationData.status || "new",
        priority: conversationData.priority || "normal",
        tags: conversationData.tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar conversa:", error);
      throw new Error("Erro ao criar conversa");
    }

    return {
      ...data,
      status: data.status as ConversationStatus,
      priority: data.priority as ConversationPriority,
      user_name: "Usuário",
      user_email: "",
      risk_flags: (data.risk_flags || []) as RiskFlag[],
      tags: (data.tags || []) as ConversationTag[],
    };
  }

  /**
   * Atualiza o status de uma conversa
   */
  async updateStatus(id: string, status: ConversationStatus): Promise<Conversation> {
    const { data, error } = await supabase
      .from("support_conversations")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar status:", error);
      throw new Error("Erro ao atualizar status");
    }

    // Buscar dados do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.user_id)
      .single();

    return {
      ...data,
      status: data.status as ConversationStatus,
      priority: data.priority as ConversationPriority,
      user_name: profile?.full_name || profile?.email || "Usuário",
      user_email: profile?.email || "",
      risk_flags: (data.risk_flags || []) as RiskFlag[],
      tags: (data.tags || []) as ConversationTag[],
    };
  }

  /**
   * Atualiza as tags de uma conversa
   */
  async updateTags(id: string, tags: ConversationTag[]): Promise<Conversation> {
    const { data, error } = await supabase
      .from("support_conversations")
      .update({ tags })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar tags:", error);
      throw new Error("Erro ao atualizar tags");
    }

    // Buscar dados do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.user_id)
      .single();

    return {
      ...data,
      status: data.status as ConversationStatus,
      priority: data.priority as ConversationPriority,
      user_name: profile?.full_name || profile?.email || "Usuário",
      user_email: profile?.email || "",
      risk_flags: (data.risk_flags || []) as RiskFlag[],
      tags: (data.tags || []) as ConversationTag[],
    };
  }

  /**
   * Atualiza as flags de risco de uma conversa
   */
  async updateRiskFlags(id: string, risk_flags: RiskFlag[]): Promise<Conversation> {
    const { data, error } = await supabase
      .from("support_conversations")
      .update({ risk_flags })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar flags de risco:", error);
      throw new Error("Erro ao atualizar flags de risco");
    }

    // Buscar dados do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.user_id)
      .single();

    return {
      ...data,
      status: data.status as ConversationStatus,
      priority: data.priority as ConversationPriority,
      user_name: profile?.full_name || profile?.email || "Usuário",
      user_email: profile?.email || "",
      risk_flags: (data.risk_flags || []) as RiskFlag[],
      tags: (data.tags || []) as ConversationTag[],
    };
  }

  /**
   * Atualiza a data prometida de uma conversa
   */
  async updatePromisedDate(id: string, promised_date: string | null): Promise<Conversation> {
    const { data, error } = await supabase
      .from("support_conversations")
      .update({ promised_date })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar data prometida:", error);
      throw new Error("Erro ao atualizar data prometida");
    }

    // Buscar dados do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.user_id)
      .single();

    return {
      ...data,
      status: data.status as ConversationStatus,
      priority: data.priority as ConversationPriority,
      user_name: profile?.full_name || profile?.email || "Usuário",
      user_email: profile?.email || "",
      risk_flags: (data.risk_flags || []) as RiskFlag[],
      tags: (data.tags || []) as ConversationTag[],
    };
  }

  /**
   * Busca conversas por termo de busca
   */
  async searchConversations(searchTerm: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from("support_conversations")
      .select("*")
      .or(`subject.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`)
      .order("last_message_at", { ascending: false});

    if (error) {
      console.error("Erro ao buscar conversas:", error);
      throw new Error("Erro ao buscar conversas");
    }

    // Buscar dados dos usuários
    const userIds = [...new Set((data || []).map((conv: any) => conv.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profilesMap = new Map(
      (profiles || []).map((p: any) => [p.id, p])
    );

    return (data || []).map((conv: any) => {
      const profile = profilesMap.get(conv.user_id);
      return {
        ...conv,
        status: conv.status as ConversationStatus,
        priority: conv.priority as ConversationPriority,
        user_name: profile?.full_name || profile?.email || "Usuário",
        user_email: profile?.email || "",
        risk_flags: (conv.risk_flags || []) as RiskFlag[],
        tags: (conv.tags || []) as ConversationTag[],
      };
    });
  }

  /**
   * Conta mensagens não lidas em uma conversa
   * @param conversationId ID da conversa
   * @param viewerType Tipo de visualizador ('customer' ou 'admin')
   */
  async getUnreadCount(conversationId: string, viewerType: 'customer' | 'admin'): Promise<number> {
    // Para cliente: contar mensagens do admin/system que não foram lidas
    // Para admin: contar mensagens do cliente que não foram lidas
    const senderType = viewerType === 'customer' ? ['admin', 'system'] : ['customer'];
    
    const { count, error } = await supabase
      .from("support_messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .in("sender_type", senderType)
      .eq("is_internal", false)
      .is("read_at", null);

    if (error) {
      console.error("Erro ao contar mensagens não lidas:", error);
      return 0;
    }

    return count || 0;
  }
}

export const conversationService = new ConversationService();
