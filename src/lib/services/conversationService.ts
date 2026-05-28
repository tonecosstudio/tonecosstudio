import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { log } from "@/lib/logger";
import { sanitizePostgrestSearchTerm } from "@/lib/postgrest-search";
import {
  createSupportConversationRpc,
  updateSupportConversationRpc,
  type SupportConversationMutationRow,
} from "@/lib/services/supportConversationMutationsService";
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
type MutableSupportConversationRow = SupportConversationRow | SupportConversationMutationRow;
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
  row: MutableSupportConversationRow,
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
    user_name: profile?.full_name || profile?.email || "Usuario",
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

async function mapConversations(rows: MutableSupportConversationRow[]): Promise<Conversation[]> {
  const userIds = [...new Set(rows.map((conversation) => conversation.user_id))];
  const profilesMap = await getProfilesMap(userIds);

  return rows.map((conversation) =>
    mapConversation(conversation, profilesMap.get(conversation.user_id))
  );
}

async function mapConversationWithProfile(row: MutableSupportConversationRow): Promise<Conversation> {
  const profilesMap = await getProfilesMap([row.user_id]);
  return mapConversation(row, profilesMap.get(row.user_id));
}

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

    return mapConversations((data ?? []) as SupportConversationRow[]);
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

    const profilesMap = await getProfilesMap([data.user_id]);
    return mapConversation(data as SupportConversationRow, profilesMap.get(data.user_id));
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

      return mapConversationWithProfile(conversation);
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
      return mapConversationWithProfile(conversation);
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
      return mapConversationWithProfile(conversation);
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
      return mapConversationWithProfile(conversation);
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
      return mapConversationWithProfile(conversation);
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

    return mapConversations((data ?? []) as SupportConversationRow[]);
  }

  /**
   * Conta mensagens nao lidas em uma conversa
   */
  async getUnreadCount(conversationId: string, viewerType: "customer" | "admin"): Promise<number> {
    const senderType = viewerType === "customer" ? ["admin", "system"] : ["customer"];

    const { count, error } = await supabase
      .from("support_messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .in("sender_type", senderType)
      .eq("is_internal", false)
      .is("read_at", null);

    if (error) {
      log.error("Erro ao contar mensagens nao lidas", { error, conversationId, viewerType });
      return 0;
    }

    return count || 0;
  }
}

export const conversationService = new ConversationService();
