/**
 * Serviço de Gestão de Produção
 *
 * Este serviço gerencia a fila de produção, métricas e operações
 * relacionadas ao sistema de gestão de produção.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { calculateEstimatedCompletion } from "./stage-service";
import log from "@/lib/logger";
import { PRODUCTION_STAGE_LABELS, PRODUCTION_STAGE_ORDER } from "@/config/production-stages";
import { sanitizePostgrestSearchTerm } from "@/lib/postgrest-search";
import {
  assignProductionRpc,
  blockProductionRpc,
  unblockProductionRpc,
  updateProductionEstimatedCompletionRpc,
  updateProductionNotesRpc,
  updateProductionScheduleRpc,
  updateProductionStageRpc,
} from "@/services/admin/admin-production-mutations-service";
import { getProductionPriorityFromScore } from "@/types/production";
import type {
  ChoiceStatus,
  Priority,
  ProductionFilters,
  ProductionQueueItem,
  ProductionStage,
  ProductionStatus,
} from "@/types/production";

// ============================================================================
// Tipos
// ============================================================================

export type {
  ChoiceStatus,
  Priority,
  ProductionFilters,
  ProductionQueueItem,
  ProductionStage,
  ProductionStatus,
};

// ============================================================================
// Constantes de Estágios
// ============================================================================

/**
 * Labels legíveis para cada estágio de produção
 */
export const STAGE_LABELS: Record<ProductionStage, string> = PRODUCTION_STAGE_LABELS;

/**
 * Descrições detalhadas para cada estágio
 */
export const STAGE_DESCRIPTIONS: Record<ProductionStage, string> = {
  awaiting_payment: 'Pedido criado, aguardando confirmação de pagamento',
  payment_confirmed: 'Pagamento aprovado, pedido liberado para produção',
  awaiting_choice: 'Cliente precisa escolher personagem do mês',
  model_preparation: 'Conferência de arquivos e ajustes no modelo 3D',
  printing: 'Estatueta sendo impressa camada por camada',
  post_processing: 'Remoção de suportes e lixamento da peça',
  painting: 'Aplicação de cores e detalhes à mão',
  quality_check: 'Inspeção final e fotos da peça',
  packaging: 'Caixa premium MDF + certificado de autenticidade',
  ready_to_ship: 'Aguardando coleta da transportadora',
  shipped: 'Despachado com código de rastreamento',
  delivered: 'Cliente recebeu o pedido',
};

/**
 * Ícones para cada estágio (para UI)
 */
export const STAGE_ICONS: Record<ProductionStage, string> = {
  awaiting_payment: '💳',
  payment_confirmed: '✅',
  awaiting_choice: '🎭',
  model_preparation: '📐',
  printing: '🖨️',
  post_processing: '🔧',
  painting: '🎨',
  quality_check: '🔍',
  packaging: '📦',
  ready_to_ship: '📮',
  shipped: '🚚',
  delivered: '🏠',
};

/**
 * Estágios que devem gerar notificação ao cliente
 */
export const NOTIFICATION_STAGES: ProductionStage[] = [
  'payment_confirmed',
  'printing',
  'painting',
  'quality_check',
  'shipped',
  'delivered',
];

/**
 * Ordem dos estágios para validação de transições
 */
export const STAGE_ORDER: ProductionStage[] = [
  ...PRODUCTION_STAGE_ORDER,
];

/**
 * Retorna o próximo estágio válido
 */
export function getNextStage(currentStage: ProductionStage): ProductionStage | null {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === STAGE_ORDER.length - 1) {
    return null;
  }
  return STAGE_ORDER[currentIndex + 1];
}

/**
 * Retorna o estágio anterior
 */
export function getPreviousStage(currentStage: ProductionStage): ProductionStage | null {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  if (currentIndex <= 0) {
    return null;
  }
  return STAGE_ORDER[currentIndex - 1];
}

/**
 * Valida se uma transição de estágio é permitida
 */
export function isValidStageTransition(
  from: ProductionStage,
  to: ProductionStage
): boolean {
  const fromIndex = STAGE_ORDER.indexOf(from);
  const toIndex = STAGE_ORDER.indexOf(to);

  if (fromIndex === -1 || toIndex === -1) {
    return false;
  }

  // Permite avançar para próximo estágio
  if (toIndex === fromIndex + 1) {
    return true;
  }

  // Permite retroceder de quality_check para painting ou post_processing
  if (from === 'quality_check' && (to === 'painting' || to === 'post_processing')) {
    return true;
  }

  return false;
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

// ============================================================================
// Função Principal: Buscar Fila de Produção
// ============================================================================

/**
 * Busca itens da fila de produção com filtros e paginação
 *
 * Esta função:
 * 1. Busca dados da view production_queue_with_details
 * 2. Aplica filtros de coleção, prioridade, estágio, etc.
 * 3. Aplica busca por nome/email do cliente
 * 4. Ordena por prioridade e data
 * 5. Aplica paginação
 *
 * @param filters - Filtros a serem aplicados
 * @param pagination - Parâmetros de paginação
 * @returns Resposta paginada com itens da fila de produção
 */
export async function fetchProductionQueue(
  filters: ProductionFilters,
  pagination: PaginationParams
): Promise<PaginatedResponse<ProductionQueueItem>> {
  const { page, pageSize } = pagination;
  const offset = (page - 1) * pageSize;

  // Query production_queue without explicit joins
  // We'll fetch related data separately or use the denormalized fields
  let query = supabase
    .from("production_queue")
    .select("*", { count: "exact" });

  // Aplicar filtros de coleção
  if (filters.collections && filters.collections.length > 0) {
    query = query.in("collection_id", filters.collections);
  }

  // Aplicar filtros de prioridade
  if (filters.priorities && filters.priorities.length > 0) {
    query = query.or(filters.priorities.map(priorityFilterClause).join(","));
  }

  // Aplicar filtros de estágio
  if (filters.stages && filters.stages.length > 0) {
    query = query.in("current_stage", filters.stages);
  }

  // Aplicar filtros de status
  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in("production_status", filters.statuses);
  }

  // Aplicar filtros de atribuição
  if (filters.assignedTo && filters.assignedTo.length > 0) {
    query = query.in("assigned_to", filters.assignedTo);
  }

  // Aplicar filtros de data
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  // Aplicar busca por texto (nome ou email do cliente)
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const searchTerm = sanitizePostgrestSearchTerm(filters.searchQuery);
    if (searchTerm) {
      query = query.or(`customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
    }
  }

  // Ordenar por prioridade (score) e data de criação
  query = query.order("priority_score", { ascending: false });
  query = query.order("created_at", { ascending: false });

  // Aplicar paginação
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    log.error("Erro ao buscar fila de produção", { error: error.message });
    throw new Error(`Erro ao buscar fila de produção: ${error.message}`);
  }

  // Transform data - handle both view format and joined table format
  const items: ProductionQueueItem[] = (data || []).map((item) => transformProductionQueueItem(item));

  return {
    data: items,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

// ============================================================================
// Função: Buscar Métricas de Produção
// ============================================================================

/**
 * Busca métricas agregadas de produção
 *
 * Calcula estatísticas completas sobre a fila de produção.
 *
 * @returns Métricas de produção
 */
export async function fetchProductionMetrics(): Promise<ProductionMetrics> {
  try {
    // Calculate metrics from production_queue table
    const { data: queueData, error: queueError } = await supabase
      .from("production_queue")
      .select("*");

    if (queueError) {
      throw new Error(`Erro ao buscar dados da fila: ${queueError.message}`);
    }

    const items = queueData || [];

    // Calculate metrics manually
    const stages: Record<string, number> = {};
    for (const stage of STAGE_ORDER) {
      stages[stage] = 0;
    }

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
      // Count by stage
      if (item.current_stage) {
        if (stages[item.current_stage] !== undefined) {
          stages[item.current_stage]++;
        } else {
          stages[item.current_stage] = 1;
        }
      }

      // Count by status
      if (item.production_status && Object.prototype.hasOwnProperty.call(statuses, item.production_status)) {
        statuses[item.production_status as ProductionStatus]++;
      }

      // Count by priority
      priorities[getProductionPriorityFromScore(item.priority, item.priority_score)]++;

      // Count by choice status
      if (item.choice_status && Object.prototype.hasOwnProperty.call(choices, item.choice_status)) {
        choices[item.choice_status as ChoiceStatus]++;
      }

      // Check urgent alerts
      if (item.choice_deadline) {
        const deadline = new Date(item.choice_deadline);
        const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilDeadline < 24 && hoursUntilDeadline > 0) {
          deadlineCritical++;
        } else if (item.choice_status === "pending" && hoursUntilDeadline < 72) {
          deadlineUrgent++;
        }
      }

      if (item.production_status === "on_hold") {
        blocked++;
      }

      // Check overdue: estimated completion date passed
      if (item.estimated_completion_date) {
        const estimatedDate = new Date(item.estimated_completion_date);
        if (estimatedDate < now && item.production_status !== "completed" && item.production_status !== "cancelled") {
          overdue++;
        }
      }

      // Check scheduled dates
      if (item.scheduled_production_date) {
        const scheduledDate = new Date(item.scheduled_production_date);
        if (scheduledDate >= today && scheduledDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
          scheduledToday++;
        }
        if (scheduledDate >= today && scheduledDate < weekFromNow) {
          scheduledThisWeek++;
        }
        if (scheduledDate >= today && scheduledDate < monthFromNow) {
          scheduledThisMonth++;
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
    log.error("Erro ao buscar métricas de produção", { error });
    throw new Error(`Erro ao buscar métricas de produção: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
  }
}

// ============================================================================
// Função: Atualizar Estágio de Produção
// ============================================================================

/**
 * Atualiza o estágio de produção de um item
 *
 * Esta função:
 * 1. Valida a transição de estágio
 * 2. Atualiza o current_stage na production_queue
 * 3. Atualiza o production_status se necessário
 * 4. Registra a mudança no histórico
 *
 * @param id - ID do item na fila de produção
 * @param newStage - Novo estágio
 * @returns Item atualizado
 */
export async function updateProductionStage(
  id: string,
  newStage: ProductionStage
): Promise<ProductionQueueItem> {
  // Buscar item atual
  const { data: currentItem, error: fetchError } = await supabase
    .from("production_queue")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !currentItem) {
    throw new Error(`Item não encontrado: ${fetchError?.message || "ID inválido"}`);
  }

  const updatedItem = await updateProductionStageRpc(id, newStage);

  return transformProductionQueueItem(updatedItem);
}

// ============================================================================
// Função: Atribuir Produção
// ============================================================================

/**
 * Atribui um item de produção a um usuário
 *
 * @param id - ID do item na fila de produção
 * @param userId - ID do usuário a ser atribuído
 * @returns Item atualizado
 */
export async function assignProduction(
  id: string,
  userId: string,
  reason?: string
): Promise<ProductionQueueItem> {
  // Get current assignment info for logging
  const { data: currentItem } = await supabase
    .from("production_queue")
    .select("assigned_to, assigned_to_name")
    .eq("id", id)
    .single();

  const isReassignment = currentItem?.assigned_to && currentItem.assigned_to !== userId;

  const updatedItem = await assignProductionRpc({ queueId: id, userId, reason });

  // Send notification to assigned team member
  try {
    // Import notification service dynamically to avoid circular dependencies
    const { productionNotificationService } = await import("@/services/notifications/production-notification-service");

    // Send assignment notification
    await productionNotificationService.sendAssignmentNotification(id, userId, Boolean(isReassignment));
  } catch (notifError) {
    log.error("Erro ao enviar notificação de atribuição", { notifError });
    // Don't fail the assignment if notification fails
  }

  return transformProductionQueueItem(updatedItem);
}

// ============================================================================
// Função: Bloquear Produção
// ============================================================================

/**
 * Bloqueia um item de produção com um motivo
 *
 * @param id - ID do item na fila de produção
 * @param reason - Motivo do bloqueio
 * @returns Item atualizado
 */
export async function blockProduction(id: string, reason: string): Promise<ProductionQueueItem> {
  // 1. Get current production queue item to find current stage
  const { data: queueItem, error: fetchError } = await supabase
    .from("production_queue")
    .select("id, current_stage, customer_id, customer_email, collection_name, order_id, order_type")
    .eq("id", id)
    .single();

  if (fetchError || !queueItem) {
    throw new Error(`Erro ao buscar item de produção: ${fetchError?.message || "Item não encontrado"}`);
  }

  void queueItem;
  const updatedItem = await blockProductionRpc(id, reason);

  // 4. Recalculate estimated completion date
  try {
    const newEstimatedDate = await calculateEstimatedCompletion(id);

    await updateProductionEstimatedCompletionRpc(id, newEstimatedDate.toISOString());
  } catch (calcError) {
    log.error("Erro ao recalcular data estimada", { calcError });
    // Don't throw - blocking should still succeed even if date calculation fails
  }

  // 5. Send notification to customer about the delay
  try {
    const { productionNotificationService } = await import("@/services/notifications/production-notification-service");
    await productionNotificationService.sendDelayNotification(id, reason);
  } catch (notifError) {
    log.error("Erro ao enviar notificação de atraso", { notifError });
    // Don't throw - blocking should still succeed even if notification fails
  }

  // Note: Adding to urgent alerts is handled automatically by the dashboard
  // filtering on production_status = 'on_hold'

  return transformProductionQueueItem(updatedItem);
}

// ============================================================================
// Função: Desbloquear Produção
// ============================================================================

/**
 * Desbloqueia um item de produção
 *
 * @param id - ID do item na fila de produção
 * @returns Item atualizado
 */
export async function unblockProduction(id: string): Promise<ProductionQueueItem> {
  // Buscar item atual para determinar status correto
  const { data: currentItem, error: fetchError } = await supabase
    .from("production_queue")
    .select("current_stage")
    .eq("id", id)
    .single();

  if (fetchError || !currentItem) {
    throw new Error(`Item não encontrado: ${fetchError?.message || "ID inválido"}`);
  }

  if (!currentItem.current_stage) {
    throw new Error(`Item sem estágio atual: ${id}`);
  }

  const currentStageName = currentItem.current_stage;

  const { data: currentStage, error: stageFetchError } = await supabase
    .from("production_stages")
    .select("started_at")
    .eq("production_queue_id", id)
    .eq("stage_name", currentStageName)
    .maybeSingle();

  if (stageFetchError) {
    throw new Error(`Erro ao buscar estágio bloqueado: ${stageFetchError.message}`);
  }

  void currentStage;
  const updatedItem = await unblockProductionRpc(id);

  try {
    const { productionNotificationService } = await import("../notifications/production-notification-service");
    await productionNotificationService.sendStageUpdate(id, currentStageName);
  } catch (notifError) {
    log.error("Erro ao enviar notificação de desbloqueio", { notifError });
  }

  return transformProductionQueueItem(updatedItem);
}

// ============================================================================
// Função: Atualizar Data de Produção Agendada
// ============================================================================

/**
 * Atualiza a data de produção agendada de um item
 *
 * @param id - ID do item na fila de produção
 * @param newDate - Nova data de produção (formato: YYYY-MM-DD)
 * @returns Item atualizado
 */
export async function updateProductionSchedule(
  id: string,
  newDate: string
): Promise<ProductionQueueItem> {
  // Validar formato da data
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(newDate)) {
    throw new Error("Formato de data inválido. Use YYYY-MM-DD");
  }

  const updatedItem = await updateProductionScheduleRpc(id, newDate);

  return transformProductionQueueItem(updatedItem);
}

/**
 * Atualiza notas de producao de um item da fila.
 */
export async function updateProductionNotes(
  id: string,
  notes: string | null
): Promise<ProductionQueueItem> {
  const normalizedNotes = notes?.trim() || null;

  const updatedItem = await updateProductionNotesRpc(id, normalizedNotes);

  return transformProductionQueueItem(updatedItem);
}

// ============================================================================
// Funções Auxiliares
// ============================================================================

/**
 * Transforma dados do banco para o formato da interface ProductionQueueItem
 * Usa os campos denormalizados da tabela production_queue
 */
function transformProductionQueueItem(data: ProductionQueueRow): ProductionQueueItem {
  return {
    id: data.id,
    orderId: data.order_id,
    orderType: data.order_type as ProductionQueueItem["orderType"],
    customerId: data.customer_id ?? data.user_id,
    customerName: data.customer_name || "Cliente Desconhecido",
    customerEmail: data.customer_email || "",
    collectionId: data.collection_id ?? "",
    collectionName: data.collection_name || "Coleção Desconhecida",
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

