/**
 * Production management service.
 *
 * Handles production queue reads, aggregate metrics, and operational updates
 * for the backoffice production flow.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { PRODUCTION_STAGE_LABELS, PRODUCTION_STAGE_ORDER } from "@/config/production-stages";
import log from "@/lib/logger";
import { sanitizePostgrestSearchTerm } from "@/lib/postgrest-search";
import {
  createRealtimeChannel,
  removeRealtimeChannel,
} from "@/services/supabase/realtime-client";
import {
  assignProductionRpc,
  blockProductionRpc,
  unblockProductionRpc,
  updateProductionEstimatedCompletionRpc,
  updateProductionNotesRpc,
  updateProductionScheduleRpc,
  updateProductionStageRpc,
} from "@/services/admin/production/admin-production-mutations-service";
import { getProductionPriorityFromScore } from "@/types/production";
import type {
  ChoiceStatus,
  Priority,
  ProductionFilters,
  ProductionQueueItem,
  ProductionStage,
  ProductionStatus,
} from "@/types/production";
import { calculateEstimatedCompletion } from "./stage-service";
import {
  getNextStage as getNextProductionStage,
  getPreviousStage as getPreviousProductionStage,
  isValidStageTransition as isValidProductionStageTransition,
} from "./stage-validation";

export type {
  ChoiceStatus,
  Priority,
  ProductionFilters,
  ProductionQueueItem,
  ProductionStage,
  ProductionStatus,
};

export const STAGE_LABELS: Record<ProductionStage, string> = PRODUCTION_STAGE_LABELS;

export const STAGE_DESCRIPTIONS: Record<ProductionStage, string> = {
  awaiting_payment: "Pedido criado, aguardando confirmacao de pagamento",
  payment_confirmed: "Pagamento aprovado, pedido liberado para producao",
  awaiting_choice: "Cliente precisa escolher o personagem do mes",
  model_preparation: "Conferencia de arquivos e ajustes no modelo 3D",
  printing: "Estatueta sendo impressa camada por camada",
  post_processing: "Remocao de suportes e lixamento da peca",
  painting: "Aplicacao de cores e detalhes a mao",
  quality_check: "Inspecao final e fotos da peca",
  packaging: "Caixa premium MDF com certificado de autenticidade",
  ready_to_ship: "Aguardando coleta da transportadora",
  shipped: "Despachado com codigo de rastreio",
  delivered: "Cliente recebeu o pedido",
};

export const STAGE_ICONS: Record<ProductionStage, string> = {
  awaiting_payment: "💳",
  payment_confirmed: "✅",
  awaiting_choice: "🎭",
  model_preparation: "📐",
  printing: "🖨️",
  post_processing: "🔧",
  painting: "🎨",
  quality_check: "🔍",
  packaging: "📦",
  ready_to_ship: "📮",
  shipped: "🚚",
  delivered: "🏠",
};

export const NOTIFICATION_STAGES: ProductionStage[] = [
  "payment_confirmed",
  "printing",
  "painting",
  "quality_check",
  "shipped",
  "delivered",
];

export const STAGE_ORDER: ProductionStage[] = [...PRODUCTION_STAGE_ORDER];

export function getNextStage(currentStage: ProductionStage): ProductionStage | null {
  return getNextProductionStage(currentStage);
}

export function getPreviousStage(currentStage: ProductionStage): ProductionStage | null {
  return getPreviousProductionStage(currentStage);
}

export function isValidStageTransition(from: ProductionStage, to: ProductionStage): boolean {
  return isValidProductionStageTransition(from, to);
}

type ProductionQueueRow = Tables<"production_queue">;

function priorityFilterClause(priority: Priority): string {
  switch (priority) {
    case "critical":
      return "priority_score.gte.90";
    case "high":
      return "and(priority_score.gte.70,priority_score.lt.90)";
    case "normal":
      return "and(priority_score.gt.30,priority_score.lt.70)";
    case "low":
      return "priority_score.lte.30";
  }
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductionMetrics {
  stages: Record<ProductionStage, number>;
  statuses: Record<ProductionStatus, number>;
  priorities: Record<Priority, number>;
  choices: Record<ChoiceStatus, number>;
  urgent: {
    deadlineCritical: number;
    deadlineUrgent: number;
    blocked: number;
    overdue: number;
  };
  scheduled: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  avgStageDurations: Record<string, number>;
  overall: {
    totalItems: number;
    avgProductionTimeHours: number;
    completionRate: number;
    avgPriorityScore: number;
  };
  generatedAt: string;
}

/**
 * Fetches production queue items with filtering and pagination.
 */
export async function fetchProductionQueue(
  filters: ProductionFilters,
  pagination: PaginationParams
): Promise<PaginatedResponse<ProductionQueueItem>> {
  const { page, pageSize } = pagination;
  const offset = (page - 1) * pageSize;

  let query = supabase.from("production_queue").select("*", { count: "exact" });

  if (filters.collections && filters.collections.length > 0) {
    query = query.in("collection_id", filters.collections);
  }

  if (filters.priorities && filters.priorities.length > 0) {
    query = query.or(filters.priorities.map(priorityFilterClause).join(","));
  }

  if (filters.stages && filters.stages.length > 0) {
    query = query.in("current_stage", filters.stages);
  }

  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in("production_status", filters.statuses);
  }

  if (filters.assignedTo && filters.assignedTo.length > 0) {
    query = query.in("assigned_to", filters.assignedTo);
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  if (filters.searchQuery && filters.searchQuery.trim()) {
    const searchTerm = sanitizePostgrestSearchTerm(filters.searchQuery);
    if (searchTerm) {
      query = query.or(`customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
    }
  }

  query = query.order("priority_score", { ascending: false });
  query = query.order("created_at", { ascending: false });
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    log.error("Erro ao buscar fila de producao", { error: error.message });
    throw new Error(`Erro ao buscar fila de producao: ${error.message}`);
  }

  const items: ProductionQueueItem[] = (data || []).map((item) => transformProductionQueueItem(item));

  return {
    data: items,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

/**
 * Fetches aggregate production metrics.
 */
export async function fetchProductionMetrics(): Promise<ProductionMetrics> {
  try {
    const { data: queueData, error: queueError } = await supabase
      .from("production_queue")
      .select("*");

    if (queueError) {
      throw new Error(`Erro ao buscar dados da fila: ${queueError.message}`);
    }

    const items = queueData || [];

    const stages: Record<ProductionStage, number> = STAGE_ORDER.reduce(
      (acc, stage) => ({ ...acc, [stage]: 0 }),
      {} as Record<ProductionStage, number>
    );

    const statuses: Record<ProductionStatus, number> = {
      awaiting_choice: 0,
      ready_for_production: 0,
      in_production: 0,
      completed: 0,
      on_hold: 0,
      cancelled: 0,
    };

    const priorities: Record<Priority, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
    };

    const choices: Record<ChoiceStatus, number> = {
      pending: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      locked: 0,
      expired: 0,
    };

    let deadlineCritical = 0;
    let deadlineUrgent = 0;
    let blocked = 0;
    let overdue = 0;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const monthFromNow = new Date(today);
    monthFromNow.setMonth(monthFromNow.getMonth() + 1);

    let scheduledToday = 0;
    let scheduledThisWeek = 0;
    let scheduledThisMonth = 0;

    items.forEach((item) => {
      if (item.current_stage && stages[item.current_stage as ProductionStage] !== undefined) {
        stages[item.current_stage as ProductionStage] += 1;
      }

      if (item.production_status && Object.prototype.hasOwnProperty.call(statuses, item.production_status)) {
        statuses[item.production_status as ProductionStatus] += 1;
      }

      priorities[getProductionPriorityFromScore(item.priority, item.priority_score)] += 1;

      if (item.choice_status && Object.prototype.hasOwnProperty.call(choices, item.choice_status)) {
        choices[item.choice_status as ChoiceStatus] += 1;
      }

      if (item.choice_deadline) {
        const deadline = new Date(item.choice_deadline);
        const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilDeadline < 24 && hoursUntilDeadline > 0) {
          deadlineCritical += 1;
        } else if (item.choice_status === "pending" && hoursUntilDeadline < 72) {
          deadlineUrgent += 1;
        }
      }

      if (item.production_status === "on_hold") {
        blocked += 1;
      }

      if (item.estimated_completion_date) {
        const estimatedDate = new Date(item.estimated_completion_date);
        if (
          estimatedDate < now &&
          item.production_status !== "completed" &&
          item.production_status !== "cancelled"
        ) {
          overdue += 1;
        }
      }

      if (item.scheduled_production_date) {
        const scheduledDate = new Date(item.scheduled_production_date);
        if (scheduledDate >= today && scheduledDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
          scheduledToday += 1;
        }
        if (scheduledDate >= today && scheduledDate < weekFromNow) {
          scheduledThisWeek += 1;
        }
        if (scheduledDate >= today && scheduledDate < monthFromNow) {
          scheduledThisMonth += 1;
        }
      }
    });

    return {
      stages,
      statuses,
      priorities,
      choices,
      urgent: {
        deadlineCritical,
        deadlineUrgent,
        blocked,
        overdue,
      },
      scheduled: {
        today: scheduledToday,
        thisWeek: scheduledThisWeek,
        thisMonth: scheduledThisMonth,
      },
      avgStageDurations: {},
      overall: {
        totalItems: items.length,
        avgProductionTimeHours: 0,
        completionRate: items.length > 0 ? (statuses.completed / items.length) * 100 : 0,
        avgPriorityScore: 0,
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    log.error("Erro ao buscar metricas de producao", { error });
    throw new Error(
      `Erro ao buscar metricas de producao: ${error instanceof Error ? error.message : "Erro desconhecido"}`
    );
  }
}

export function subscribeToProductionMetricsChanges(onChange: () => void): () => void {
  const channel = createRealtimeChannel("production-metrics-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "production_queue",
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "production_stages",
      },
      onChange,
    )
    .subscribe();

  return () => {
    void removeRealtimeChannel(channel);
  };
}

/**
 * Updates a production stage.
 */
export async function updateProductionStage(
  id: string,
  newStage: ProductionStage
): Promise<ProductionQueueItem> {
  const { data: currentItem, error: fetchError } = await supabase
    .from("production_queue")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !currentItem) {
    throw new Error(`Item nao encontrado: ${fetchError?.message || "ID invalido"}`);
  }

  const updatedItem = await updateProductionStageRpc(id, newStage);

  return transformProductionQueueItem(updatedItem);
}

/**
 * Assigns a production item to a user.
 */
export async function assignProduction(
  id: string,
  userId: string,
  reason?: string
): Promise<ProductionQueueItem> {
  const { data: currentItem } = await supabase
    .from("production_queue")
    .select("assigned_to, assigned_to_name")
    .eq("id", id)
    .single();

  const isReassignment = currentItem?.assigned_to && currentItem.assigned_to !== userId;

  const updatedItem = await assignProductionRpc({ queueId: id, userId, reason });

  try {
    const { productionNotificationService } = await import(
      "@/services/notifications/production-notification-service"
    );
    await productionNotificationService.sendAssignmentNotification(id, userId, Boolean(isReassignment));
  } catch (notifError) {
    log.error("Erro ao enviar notificacao de atribuicao", { notifError });
  }

  return transformProductionQueueItem(updatedItem);
}

/**
 * Blocks a production item.
 */
export async function blockProduction(id: string, reason: string): Promise<ProductionQueueItem> {
  const { data: queueItem, error: fetchError } = await supabase
    .from("production_queue")
    .select("id, current_stage, customer_id, customer_email, collection_name, order_id, order_type")
    .eq("id", id)
    .single();

  if (fetchError || !queueItem) {
    throw new Error(`Erro ao buscar item de producao: ${fetchError?.message || "Item nao encontrado"}`);
  }

  void queueItem;
  const updatedItem = await blockProductionRpc(id, reason);

  try {
    const newEstimatedDate = await calculateEstimatedCompletion(id);
    await updateProductionEstimatedCompletionRpc(id, newEstimatedDate.toISOString());
  } catch (calcError) {
    log.error("Erro ao recalcular data estimada", { calcError });
  }

  try {
    const { productionNotificationService } = await import(
      "@/services/notifications/production-notification-service"
    );
    await productionNotificationService.sendDelayNotification(id, reason);
  } catch (notifError) {
    log.error("Erro ao enviar notificacao de atraso", { notifError });
  }

  return transformProductionQueueItem(updatedItem);
}

/**
 * Unblocks a production item.
 */
export async function unblockProduction(id: string): Promise<ProductionQueueItem> {
  const { data: currentItem, error: fetchError } = await supabase
    .from("production_queue")
    .select("current_stage")
    .eq("id", id)
    .single();

  if (fetchError || !currentItem) {
    throw new Error(`Item nao encontrado: ${fetchError?.message || "ID invalido"}`);
  }

  if (!currentItem.current_stage) {
    throw new Error(`Item sem estagio atual: ${id}`);
  }

  const currentStageName = currentItem.current_stage;

  const { data: currentStage, error: stageFetchError } = await supabase
    .from("production_stages")
    .select("started_at")
    .eq("production_queue_id", id)
    .eq("stage_name", currentStageName)
    .maybeSingle();

  if (stageFetchError) {
    throw new Error(`Erro ao buscar estagio bloqueado: ${stageFetchError.message}`);
  }

  void currentStage;
  const updatedItem = await unblockProductionRpc(id);

  try {
    const { productionNotificationService } = await import(
      "@/services/notifications/production-notification-service"
    );
    await productionNotificationService.sendStageUpdate(id, currentStageName);
  } catch (notifError) {
    log.error("Erro ao enviar notificacao de desbloqueio", { notifError });
  }

  return transformProductionQueueItem(updatedItem);
}

/**
 * Updates the scheduled production date for an item.
 */
export async function updateProductionSchedule(
  id: string,
  newDate: string
): Promise<ProductionQueueItem> {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(newDate)) {
    throw new Error("Formato de data invalido. Use YYYY-MM-DD");
  }

  const updatedItem = await updateProductionScheduleRpc(id, newDate);

  return transformProductionQueueItem(updatedItem);
}

/**
 * Updates production notes for a queue item.
 */
export async function updateProductionNotes(
  id: string,
  notes: string | null
): Promise<ProductionQueueItem> {
  const normalizedNotes = notes?.trim() || null;

  const updatedItem = await updateProductionNotesRpc(id, normalizedNotes);

  return transformProductionQueueItem(updatedItem);
}

function transformProductionQueueItem(data: ProductionQueueRow): ProductionQueueItem {
  return {
    id: data.id,
    orderId: data.order_id,
    orderType: data.order_type as ProductionQueueItem["orderType"],
    customerId: data.customer_id ?? data.user_id,
    customerName: data.customer_name || "Cliente desconhecido",
    customerEmail: data.customer_email || "",
    collectionId: data.collection_id ?? "",
    collectionName: data.collection_name || "Colecao desconhecida",
    characterId: data.character_id,
    characterName: data.character_name,
    productionStatus: (data.production_status ?? "awaiting_choice") as ProductionStatus,
    currentStage: (data.current_stage ?? "awaiting_payment") as ProductionStage,
    choiceStatus: (data.choice_status ?? "pending") as ChoiceStatus,
    choiceDeadline: data.choice_deadline,
    choiceMadeAt: data.choice_made_at,
    priority: getProductionPriorityFromScore(data.priority, data.priority_score),
    priorityScore: data.priority_score ?? 0,
    scheduledProductionDate: data.scheduled_production_date,
    estimatedCompletionDate: data.estimated_completion_date,
    assignedTo: data.assigned_to,
    assignedToName: data.assigned_to_name,
    assignedAt: data.assigned_at,
    productionStartedAt: data.production_started_at,
    productionCompletedAt: data.production_completed_at,
    productionNotes: data.production_notes,
    customerNotes: data.customer_notes,
    internalFlags: toStringArray(data.internal_flags),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function toStringArray(value: Json | null): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
