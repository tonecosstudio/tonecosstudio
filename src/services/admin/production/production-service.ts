/**
 * Production management service.
 *
 * Handles production queue reads, aggregate metrics, and operational updates
 * for the backoffice production flow.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PRODUCTION_STAGE_LABELS, PRODUCTION_STAGE_ORDER } from "@/config/production-stages";
import log from "@/lib/logger";
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
type ProductionStageRow = Tables<"production_stages">;
type ProfileRow = Pick<Tables<"profiles">, "id" | "full_name" | "email">;

const CHOICE_STATUS_SET = new Set<ChoiceStatus>([
  "pending",
  "submitted",
  "approved",
  "rejected",
  "locked",
  "expired",
]);

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

function parseProductionStage(value: unknown, queueId: string): ProductionStage {
  if (
    typeof value === "string" &&
    PRODUCTION_STAGE_ORDER.includes(value as ProductionStage)
  ) {
    return value as ProductionStage;
  }

  throw new Error(`Fila de producao ${queueId} possui estagio invalido`);
}

function parseChoiceStatus(value: unknown, queueId: string): ChoiceStatus {
  if (value === null || value === undefined || value === "") return "pending";
  if (typeof value === "string" && CHOICE_STATUS_SET.has(value as ChoiceStatus)) {
    return value as ChoiceStatus;
  }

  throw new Error(`Fila de producao ${queueId} possui status de escolha invalido`);
}

function parseOrderType(
  value: string | null,
  queueId: string,
): ProductionQueueItem["orderType"] {
  if (value === "subscription_delivery" || value === "standalone_purchase") {
    return value;
  }

  throw new Error(`Fila de producao ${queueId} possui tipo de pedido invalido`);
}

function deriveProductionStatus(
  queueStatus: ProductionQueueRow["status"],
  currentStage: ProductionStage,
): ProductionStatus {
  if (queueStatus === "cancelled") return "cancelled";
  if (queueStatus === "on_hold") return "on_hold";
  if (queueStatus === "completed") return "completed";
  if (currentStage === "awaiting_payment" || currentStage === "awaiting_choice") {
    return "awaiting_choice";
  }
  if (currentStage === "payment_confirmed" || currentStage === "model_preparation") {
    return "ready_for_production";
  }
  return "in_production";
}

function compareStageOrder(a: ProductionStageRow, b: ProductionStageRow): number {
  const orderA = a.stage_order ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.stage_order ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.created_at.localeCompare(b.created_at);
}

function currentStageRowForQueue(
  stages: ProductionStageRow[],
  queueId: string,
): ProductionStageRow {
  const ordered = [...stages].sort(compareStageOrder);
  const current = ordered.find((stage) => stage.status !== "completed") ?? ordered.at(-1);

  if (!current) {
    throw new Error(`Fila de producao ${queueId} nao possui estagios associados`);
  }

  return current;
}

function toDateOnly(value: string | null): string | null {
  return value ? value.slice(0, 10) : null;
}

async function hydrateProductionRows(
  rows: ProductionQueueRow[],
): Promise<ProductionQueueItem[]> {
  if (rows.length === 0) return [];

  const queueIds = rows.map((row) => row.id);
  const userIds = [...new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id)))];

  const profilesById = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    if (profilesError) {
      throw new Error(`Erro ao buscar clientes da fila: ${profilesError.message}`);
    }

    for (const profile of profiles ?? []) {
      profilesById.set(profile.id, profile);
    }
  }

  const { data: stageRows, error: stagesError } = await supabase
    .from("production_stages")
    .select("*")
    .in("production_queue_id", queueIds)
    .order("stage_order", { ascending: true });

  if (stagesError) {
    throw new Error(`Erro ao buscar estagios da fila: ${stagesError.message}`);
  }

  const stagesByQueue = new Map<string, ProductionStageRow[]>();
  for (const stage of stageRows ?? []) {
    const existing = stagesByQueue.get(stage.production_queue_id) ?? [];
    existing.push(stage);
    stagesByQueue.set(stage.production_queue_id, existing);
  }

  return rows.map((row) => {
    const stageRow = currentStageRowForQueue(stagesByQueue.get(row.id) ?? [], row.id);
    const currentStage = parseProductionStage(stageRow.stage_name, row.id);
    const profile = row.user_id ? profilesById.get(row.user_id) : undefined;

    if (!row.order_id) {
      throw new Error(`Fila de producao ${row.id} nao possui order_id`);
    }

    return {
      id: row.id,
      orderId: row.order_id,
      orderType: parseOrderType(row.order_type, row.id),
      customerId: row.user_id ?? "",
      customerName: profile?.full_name || profile?.email || "Cliente desconhecido",
      customerEmail: profile?.email || "",
      collectionId: row.collection_id ?? "",
      collectionName: row.collection_name || "Colecao desconhecida",
      characterId: row.character_id,
      characterName: row.character_name,
      productionStatus: deriveProductionStatus(row.status, currentStage),
      currentStage,
      choiceStatus: parseChoiceStatus(row.choice_status, row.id),
      choiceDeadline: row.choice_deadline,
      choiceMadeAt: row.choice_made_at,
      priority: getProductionPriorityFromScore(undefined, row.priority_score),
      priorityScore: row.priority_score ?? 0,
      scheduledProductionDate: toDateOnly(row.estimated_start_date),
      estimatedCompletionDate: row.estimated_completion_date,
      assignedTo: stageRow.assigned_to,
      assignedToName: stageRow.assigned_to_name,
      assignedAt: stageRow.assigned_at,
      productionStartedAt: row.actual_start_date,
      productionCompletedAt: row.actual_completion_date,
      productionNotes: row.admin_notes,
      customerNotes: row.notes,
      internalFlags: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } satisfies ProductionQueueItem;
  });
}

async function fetchHydratedProductionItemById(id: string): Promise<ProductionQueueItem> {
  const { data, error } = await supabase
    .from("production_queue")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error(`Item nao encontrado: ${error?.message || "ID invalido"}`);
  }

  const [item] = await hydrateProductionRows([data]);
  if (!item) {
    throw new Error(`Item nao encontrado: ${id}`);
  }

  return item;
}

async function fetchHydratedProductionItems(
  filters: ProductionFilters,
): Promise<ProductionQueueItem[]> {
  let query = supabase.from("production_queue").select("*");

  if (filters.collections && filters.collections.length > 0) {
    query = query.in("collection_id", filters.collections);
  }

  if (filters.priorities && filters.priorities.length > 0) {
    query = query.or(filters.priorities.map(priorityFilterClause).join(","));
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  query = query.order("priority_score", { ascending: false });
  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    log.error("Erro ao buscar fila de producao", { error: error.message });
    throw new Error(`Erro ao buscar fila de producao: ${error.message}`);
  }

  let items = await hydrateProductionRows(data ?? []);

  if (filters.stages && filters.stages.length > 0) {
    const allowed = new Set(filters.stages);
    items = items.filter((item) => allowed.has(item.currentStage));
  }

  if (filters.statuses && filters.statuses.length > 0) {
    const allowed = new Set(filters.statuses);
    items = items.filter((item) => allowed.has(item.productionStatus));
  }

  if (filters.assignedTo && filters.assignedTo.length > 0) {
    const allowed = new Set(filters.assignedTo);
    items = items.filter((item) => item.assignedTo !== null && allowed.has(item.assignedTo));
  }

  const searchTerm = filters.searchQuery?.trim().toLocaleLowerCase("pt-BR");
  if (searchTerm) {
    items = items.filter(
      (item) =>
        item.customerName.toLocaleLowerCase("pt-BR").includes(searchTerm) ||
        item.customerEmail.toLocaleLowerCase("pt-BR").includes(searchTerm),
    );
  }

  return items;
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
  const items = await fetchHydratedProductionItems(filters);
  const offset = (page - 1) * pageSize;
  const data = items.slice(offset, offset + pageSize);

  return {
    data,
    total: items.length,
    page,
    pageSize,
    totalPages: Math.ceil(items.length / pageSize),
  };
}

/**
 * Fetches aggregate production metrics.
 */
export async function fetchProductionMetrics(): Promise<ProductionMetrics> {
  try {
    const items = await fetchHydratedProductionItems({});

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
    let priorityScoreTotal = 0;

    items.forEach((item) => {
      stages[item.currentStage] += 1;
      statuses[item.productionStatus] += 1;
      priorities[item.priority] += 1;
      choices[item.choiceStatus] += 1;
      priorityScoreTotal += item.priorityScore;

      if (item.choiceDeadline) {
        const deadline = new Date(item.choiceDeadline);
        const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilDeadline < 24 && hoursUntilDeadline > 0) {
          deadlineCritical += 1;
        } else if (item.choiceStatus === "pending" && hoursUntilDeadline < 72) {
          deadlineUrgent += 1;
        }
      }

      if (item.productionStatus === "on_hold") {
        blocked += 1;
      }

      if (item.estimatedCompletionDate) {
        const estimatedDate = new Date(item.estimatedCompletionDate);
        if (
          estimatedDate < now &&
          item.productionStatus !== "completed" &&
          item.productionStatus !== "cancelled"
        ) {
          overdue += 1;
        }
      }

      if (item.scheduledProductionDate) {
        const scheduledDate = new Date(item.scheduledProductionDate);
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
        avgPriorityScore: items.length > 0 ? priorityScoreTotal / items.length : 0,
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
  await updateProductionStageRpc(id, newStage);
  return fetchHydratedProductionItemById(id);
}

/**
 * Assigns a production item to a user.
 */
export async function assignProduction(
  id: string,
  userId: string,
  reason?: string
): Promise<ProductionQueueItem> {
  const currentItem = await fetchHydratedProductionItemById(id);
  const isReassignment = Boolean(currentItem.assignedTo && currentItem.assignedTo !== userId);

  await assignProductionRpc({ queueId: id, userId, reason });

  try {
    const { productionNotificationService } = await import(
      "@/services/notifications/production-notification-service"
    );
    await productionNotificationService.sendAssignmentNotification(id, userId, isReassignment);
  } catch (notifError) {
    log.error("Erro ao enviar notificacao de atribuicao", { notifError });
  }

  return fetchHydratedProductionItemById(id);
}

/**
 * Blocks a production item.
 */
export async function blockProduction(id: string, reason: string): Promise<ProductionQueueItem> {
  await fetchHydratedProductionItemById(id);
  await blockProductionRpc(id, reason);

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

  return fetchHydratedProductionItemById(id);
}

/**
 * Unblocks a production item.
 */
export async function unblockProduction(id: string): Promise<ProductionQueueItem> {
  const currentItem = await fetchHydratedProductionItemById(id);
  const currentStageName = currentItem.currentStage;

  await unblockProductionRpc(id);

  try {
    const { productionNotificationService } = await import(
      "@/services/notifications/production-notification-service"
    );
    await productionNotificationService.sendStageUpdate(id, currentStageName);
  } catch (notifError) {
    log.error("Erro ao enviar notificacao de desbloqueio", { notifError });
  }

  return fetchHydratedProductionItemById(id);
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

  await updateProductionScheduleRpc(id, newDate);
  return fetchHydratedProductionItemById(id);
}

/**
 * Updates production notes for a queue item.
 */
export async function updateProductionNotes(
  id: string,
  notes: string | null
): Promise<ProductionQueueItem> {
  const normalizedNotes = notes?.trim() || null;

  await updateProductionNotesRpc(id, normalizedNotes);
  return fetchHydratedProductionItemById(id);
}
