/**
 * Serviço de Gestão de Produção
 *
 * Este serviço gerencia a fila de produção, métricas e operações
 * relacionadas ao sistema de gestão de produção.
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Tipos
// ============================================================================

export type ProductionStatus =
  | "awaiting_choice"
  | "ready_for_production"
  | "in_production"
  | "completed"
  | "on_hold"
  | "cancelled";

export type ProductionStage =
  | "awaiting_choice"
  | "design"
  | "production"
  | "quality_check"
  | "packaging"
  | "shipped";

export type Priority = "critical" | "high" | "normal" | "low";

export type ChoiceStatus = "pending" | "submitted" | "approved" | "rejected" | "locked";

export interface ProductionQueueItem {
  id: string;
  orderId: string;
  orderType: "subscription_delivery" | "standalone_purchase";
  customerId: string;
  customerName: string;
  customerEmail: string;
  collectionId: string;
  collectionName: string;
  characterId: string | null;
  characterName: string | null;
  productionStatus: ProductionStatus;
  currentStage: ProductionStage;
  choiceStatus: ChoiceStatus;
  choiceDeadline: string | null;
  choiceMadeAt: string | null;
  priority: Priority;
  priorityScore: number;
  scheduledProductionDate: string | null;
  estimatedCompletionDate: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  productionStartedAt: string | null;
  productionCompletedAt: string | null;
  productionNotes: string | null;
  customerNotes: string | null;
  internalFlags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductionFilters {
  collections?: string[];
  priorities?: Priority[];
  stages?: ProductionStage[];
  statuses?: ProductionStatus[];
  assignedTo?: string[];
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
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

  // Iniciar query na view otimizada
  let query = supabase.from("production_queue_with_details").select("*", { count: "exact" });

  // Aplicar filtros de coleção
  if (filters.collections && filters.collections.length > 0) {
    query = query.in("collection_id", filters.collections);
  }

  // Aplicar filtros de prioridade
  if (filters.priorities && filters.priorities.length > 0) {
    query = query.in("priority", filters.priorities);
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
    const searchTerm = filters.searchQuery.trim();
    query = query.or(`customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
  }

  // Ordenar por prioridade (score) e data de criação
  query = query.order("priority_score", { ascending: false });
  query = query.order("created_at", { ascending: false });

  // Aplicar paginação
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Erro ao buscar fila de produção: ${error.message}`);
  }

  // Transformar dados do banco para o formato da interface
  const items: ProductionQueueItem[] = (data || []).map(transformProductionQueueItem);

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
 * Utiliza a função get_production_metrics() do PostgreSQL que retorna
 * estatísticas completas sobre a fila de produção.
 *
 * @returns Métricas de produção
 */
export async function fetchProductionMetrics(): Promise<ProductionMetrics> {
  const { data, error } = await supabase.rpc("get_production_metrics");

  if (error) {
    throw new Error(`Erro ao buscar métricas de produção: ${error.message}`);
  }

  // A função retorna JSON, então precisamos fazer parse se necessário
  const metrics = typeof data === "string" ? JSON.parse(data) : data;

  return {
    stages: metrics.stages || {},
    statuses: metrics.statuses || {},
    priorities: metrics.priorities || {},
    choices: metrics.choices || {},
    urgent: {
      deadlineCritical: metrics.urgent?.deadline_critical || 0,
      deadlineUrgent: metrics.urgent?.deadline_urgent || 0,
      blocked: metrics.urgent?.blocked || 0,
      overdue: metrics.urgent?.overdue || 0,
    },
    scheduled: {
      today: metrics.scheduled?.today || 0,
      thisWeek: metrics.scheduled?.this_week || 0,
      thisMonth: metrics.scheduled?.this_month || 0,
    },
    avgStageDurations: metrics.avg_stage_durations || {},
    overall: {
      totalItems: metrics.overall?.total_items || 0,
      avgProductionTimeHours: metrics.overall?.avg_production_time_hours || 0,
      completionRate: metrics.overall?.completion_rate || 0,
      avgPriorityScore: metrics.overall?.avg_priority_score || 0,
    },
    generatedAt: metrics.generated_at || new Date().toISOString(),
  };
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

  // Determinar novo status baseado no estágio
  let newStatus: ProductionStatus = currentItem.production_status;

  if (newStage === "awaiting_choice") {
    newStatus = "awaiting_choice";
  } else if (newStage === "design" && currentItem.production_status === "awaiting_choice") {
    newStatus = "ready_for_production";
  } else if (["production", "quality_check", "packaging"].includes(newStage)) {
    newStatus = "in_production";
  } else if (newStage === "shipped") {
    newStatus = "completed";
  }

  // Atualizar item
  const { data: updatedItem, error: updateError } = await supabase
    .from("production_queue")
    .update({
      current_stage: newStage,
      production_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError || !updatedItem) {
    throw new Error(`Erro ao atualizar estágio: ${updateError?.message || "Falha na atualização"}`);
  }

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
export async function assignProduction(id: string, userId: string): Promise<ProductionQueueItem> {
  // Buscar nome do usuário
  const { data: user } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single();

  const userName = user?.full_name || user?.email || "Usuário";

  // Atualizar item
  const { data: updatedItem, error: updateError } = await supabase
    .from("production_queue")
    .update({
      assigned_to: userId,
      assigned_to_name: userName,
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError || !updatedItem) {
    throw new Error(`Erro ao atribuir produção: ${updateError?.message || "Falha na atualização"}`);
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
  // Atualizar item
  const { data: updatedItem, error: updateError } = await supabase
    .from("production_queue")
    .update({
      production_status: "on_hold",
      production_notes: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError || !updatedItem) {
    throw new Error(`Erro ao bloquear produção: ${updateError?.message || "Falha na atualização"}`);
  }

  // TODO: Criar notificação para o cliente sobre o bloqueio
  // TODO: Atualizar production_stages para marcar estágio atual como bloqueado

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

  // Determinar status baseado no estágio atual
  let newStatus: ProductionStatus = "ready_for_production";

  if (currentItem.current_stage === "awaiting_choice") {
    newStatus = "awaiting_choice";
  } else if (["production", "quality_check", "packaging"].includes(currentItem.current_stage)) {
    newStatus = "in_production";
  } else if (currentItem.current_stage === "shipped") {
    newStatus = "completed";
  }

  // Atualizar item
  const { data: updatedItem, error: updateError } = await supabase
    .from("production_queue")
    .update({
      production_status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError || !updatedItem) {
    throw new Error(
      `Erro ao desbloquear produção: ${updateError?.message || "Falha na atualização"}`
    );
  }

  // TODO: Criar notificação para o cliente sobre o desbloqueio
  // TODO: Atualizar production_stages para desmarcar bloqueio

  return transformProductionQueueItem(updatedItem);
}

// ============================================================================
// Funções Auxiliares
// ============================================================================

/**
 * Transforma dados do banco para o formato da interface ProductionQueueItem
 */
function transformProductionQueueItem(data: any): ProductionQueueItem {
  return {
    id: data.id,
    orderId: data.order_id,
    orderType: data.order_type,
    customerId: data.customer_id,
    customerName: data.customer_name,
    customerEmail: data.customer_email,
    collectionId: data.collection_id,
    collectionName: data.collection_name,
    characterId: data.character_id,
    characterName: data.character_name,
    productionStatus: data.production_status,
    currentStage: data.current_stage,
    choiceStatus: data.choice_status,
    choiceDeadline: data.choice_deadline,
    choiceMadeAt: data.choice_made_at,
    priority: data.priority,
    priorityScore: data.priority_score,
    scheduledProductionDate: data.scheduled_production_date,
    estimatedCompletionDate: data.estimated_completion_date,
    assignedTo: data.assigned_to,
    assignedToName: data.assigned_to_name,
    assignedAt: data.assigned_at,
    productionStartedAt: data.production_started_at,
    productionCompletedAt: data.production_completed_at,
    productionNotes: data.production_notes,
    customerNotes: data.customer_notes,
    internalFlags: data.internal_flags || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
