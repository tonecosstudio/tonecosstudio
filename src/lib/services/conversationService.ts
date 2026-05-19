import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { log } from "@/lib/logger";
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

type SupportConversationRow = Database["public"]["Tables"]["support_conversations"]["Row"] & {
  order_id?: string | null;
  quote_id?: string | null;
  subscription_id?: string | null;
  promised_date?: string | null;
  tags?: unknown;
  risk_flags?: unknown;
};
type ProfileSummary = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "email"
>;

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function mapConversation(
  row: SupportConversationRow,
  profile?: ProfileSummary
): Conversation {
  return {
    id: row.id,
    user_id: row.user_id,
    subject: row.subject,
    status: row.status as ConversationStatus,
    priority: (row.priority ?? "normal") as ConversationPriority,
    tags: toStringArray(row.tags) as ConversationTag[],
    risk_flags: toStringArray(row.risk_flags) as RiskFlag[],
    assigned_to: row.assigned_to ?? undefined,
    promised_date: row.promised_date ?? undefined,
    first_response_at: row.first_response_at ?? undefined,
    resolved_at: row.resolved_at ?? undefined,
    last_message_at: row.last_message_at ?? row.updated_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    order_id: row.order_id ?? undefined,
    quote_id: row.quote_id ?? undefined,
    subscription_id: row.subscription_id ?? undefined,
    payment_id: row.payment_id ?? undefined,
    user_name: profile?.full_name || profile?.email || "Usuário",
    user_email: profile?.email || "",
  };
}

async function getProfilesMap(userIds: string[]): Promise<Map<string, ProfileSummary>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  if (error) {
    log.warn("Failed to load conversation profile summaries", { error, userIds });
    return new Map();
  }

  return new Map((data ?? []).map((profile) => [profile.id, profile]));
}

async function mapConversations(rows: SupportConversationRow[]): Promise<Conversation[]> {
  const userIds = [...new Set(rows.map((conversation) => conversation.user_id))];
  const profilesMap = await getProfilesMap(userIds);

  return rows.map((conversation) =>
    mapConversation(conversation, profilesMap.get(conversation.user_id))
  );
}

export class ConversationService {
  /**
   * Lista conversas com filtros e ordenação
   */
  async listConversations(
    filters?: ConversationFilters,
    pagination?: PaginationOptions
  ): Promise<Conversation[]> {
    let query = supabase.from("support_conversations").select("*");

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
      query = query.or(`subject.ilike.%${filters.search}%,id.ilike.%${filters.search}%`);
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
      query = query.range(pagination.offset, pagination.offset + (pagination.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      log.error("Erro ao listar conversas", { error, filters, pagination });
      throw new Error("Erro ao carregar conversas");
    }

    return mapConversations((data ?? []) as SupportConversationRow[]);
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
      log.error("Erro ao buscar conversa", { error, conversationId: id });
      throw new Error("Erro ao carregar conversa");
    }

    if (!data) return null;

    // Buscar dados do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.user_id)
      .single();

    return mapConversation(data as SupportConversationRow, profile ?? undefined);
  }

  /**
   * Cria uma nova conversa
   */
  async createConversation(conversationData: CreateConversationData): Promise<Conversation> {
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
      log.error("Erro ao criar conversa", { error, conversationData });
      throw new Error("Erro ao criar conversa");
    }

    return mapConversation(data as SupportConversationRow);
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
      log.error("Erro ao atualizar status", { error, conversationId: id, status });
      throw new Error("Erro ao atualizar status");
    }

    // Buscar dados do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.user_id)
      .single();

    return mapConversation(data as SupportConversationRow, profile ?? undefined);
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
      log.error("Erro ao atualizar tags", { error, conversationId: id, tags });
      throw new Error("Erro ao atualizar tags");
    }

    // Buscar dados do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.user_id)
      .single();

    return mapConversation(data as SupportConversationRow, profile ?? undefined);
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
      log.error("Erro ao atualizar flags de risco", {
        error,
        conversationId: id,
        risk_flags,
      });
      throw new Error("Erro ao atualizar flags de risco");
    }

    // Buscar dados do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.user_id)
      .single();

    return mapConversation(data as SupportConversationRow, profile ?? undefined);
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
      log.error("Erro ao atualizar data prometida", {
        error,
        conversationId: id,
        promised_date,
      });
      throw new Error("Erro ao atualizar data prometida");
    }

    // Buscar dados do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", data.user_id)
      .single();

    return mapConversation(data as SupportConversationRow, profile ?? undefined);
  }

  /**
   * Busca conversas por termo de busca
   */
  async searchConversations(searchTerm: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from("support_conversations")
      .select("*")
      .or(`subject.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`)
      .order("last_message_at", { ascending: false });

    if (error) {
      log.error("Erro ao buscar conversas", { error, searchTerm });
      throw new Error("Erro ao buscar conversas");
    }

    return mapConversations((data ?? []) as SupportConversationRow[]);
  }

  /**
   * Conta mensagens não lidas em uma conversa
   * @param conversationId ID da conversa
   * @param viewerType Tipo de visualizador ('customer' ou 'admin')
   */
  async getUnreadCount(conversationId: string, viewerType: "customer" | "admin"): Promise<number> {
    // Para cliente: contar mensagens do admin/system que não foram lidas
    // Para admin: contar mensagens do cliente que não foram lidas
    const senderType = viewerType === "customer" ? ["admin", "system"] : ["customer"];

    const { count, error } = await supabase
      .from("support_messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .in("sender_type", senderType)
      .eq("is_internal", false)
      .is("read_at", null);

    if (error) {
      log.error("Erro ao contar mensagens não lidas", { error, conversationId, viewerType });
      return 0;
    }

    return count || 0;
  }
}

export const conversationService = new ConversationService();
