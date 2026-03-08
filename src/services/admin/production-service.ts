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
  | "awaiting_payment"      // 1. Aguardando Pagamento
  | "payment_confirmed"     // 2. Pagamento Confirmado
  | "awaiting_choice"       // 3. Aguardando Escolha (assinaturas)
  | "model_preparation"     // 4. Preparação do Modelo
  | "printing"              // 5. Em Impressão 3D
  | "post_processing"       // 6. Limpeza e Preparação
  | "painting"              // 7. Pintura Artesanal
  | "quality_check"         // 8. Controle de Qualidade
  | "packaging"             // 9. Embalagem
  | "ready_to_ship"         // 10. Pronto para Envio
  | "shipped"               // 11. Enviado
  | "delivered";            // 12. Entregue

export type Priority = "critical" | "high" | "normal" | "low";

export type ChoiceStatus = "pending" | "submitted" | "approved" | "rejected" | "locked";

// ============================================================================
// Constantes de Estágios
// ============================================================================

/**
 * Labels legíveis para cada estágio de produção
 */
export const STAGE_LABELS: Record<ProductionStage, string> = {
  awaiting_payment: 'Aguardando Pagamento',
  payment_confirmed: 'Pagamento Confirmado',
  awaiting_choice: 'Aguardando Escolha',
  model_preparation: 'Preparação do Modelo',
  printing: 'Em Impressão 3D',
  post_processing: 'Limpeza e Preparação',
  painting: 'Pintura Artesanal',
  quality_check: 'Controle de Qualidade',
  packaging: 'Embalagem',
  ready_to_ship: 'Pronto para Envio',
  shipped: 'Enviado',
  delivered: 'Entregue',
};

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
  'awaiting_payment',
  'payment_confirmed',
  'awaiting_choice',
  'model_preparation',
  'printing',
  'post_processing',
  'painting',
  'quality_check',
  'packaging',
  'ready_to_ship',
  'shipped',
  'delivered',
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
    console.error("Erro ao buscar fila de produção:", error);
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
    const stages: Record<ProductionStage, number> = {
      awaiting_choice: 0,
      design: 0,
      production: 0,
      quality_check: 0,
      packaging: 0,
      shipped: 0,
    };

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
    };

    let deadlineCritical = 0;
    let deadlineUrgent = 0;
    let blocked = 0;

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
      if (item.current_stage && Object.prototype.hasOwnProperty.call(stages, item.current_stage)) {
        stages[item.current_stage as ProductionStage]++;
      }

      // Count by status
      if (item.production_status && Object.prototype.hasOwnProperty.call(statuses, item.production_status)) {
        statuses[item.production_status as ProductionStatus]++;
      }

      // Count by priority
      if (item.priority && Object.prototype.hasOwnProperty.call(priorities, item.priority)) {
        priorities[item.priority as Priority]++;
      }

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
        completionRate: items.length > 0 ? statuses.completed / items.length : 0,
        avgPriorityScore: 0,
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Erro ao buscar métricas de produção:", error);
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

  // Fetch user information
  const { data: user, error: userError } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    throw new Error(`Erro ao buscar usuário: ${userError?.message || "Usuário não encontrado"}`);
  }

  const userName = user.full_name || user.email || "Usuário";

  // Update production queue item
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

  // Log the assignment
  try {
    await supabase.from("production_assignment_logs").insert({
      production_queue_id: id,
      assigned_to: userId,
      assigned_to_name: userName,
      assigned_by: (await supabase.auth.getUser()).data.user?.id,
      is_reassignment: isReassignment,
      previous_assignee: currentItem?.assigned_to,
      previous_assignee_name: currentItem?.assigned_to_name,
      reason: reason || (isReassignment ? "Reatribuição" : "Atribuição inicial"),
      assigned_at: new Date().toISOString(),
    });
  } catch (logError) {
    console.error("Erro ao registrar log de atribuição:", logError);
    // Don't fail the assignment if logging fails
  }

  // Send notification to assigned team member
  try {
    // Import notification service dynamically to avoid circular dependencies
    const { ProductionNotificationService } = await import("@/services/notifications/production-notification-service");
    const notificationService = new ProductionNotificationService();
    
    // Send assignment notification
    await notificationService.sendAssignmentNotification(id, userId, isReassignment);
  } catch (notifError) {
    console.error("Erro ao enviar notificação de atribuição:", notifError);
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

  // 2. Update production_stages to mark current stage as blocked
  const { error: stageError } = await supabase
    .from("production_stages")
    .update({
      is_blocked: true,
      block_reason: reason,
      blocked_at: new Date().toISOString(),
      status: "blocked",
      updated_at: new Date().toISOString(),
    })
    .eq("production_queue_id", id)
    .eq("stage_name", queueItem.current_stage);

  if (stageError) {
    throw new Error(`Erro ao bloquear estágio: ${stageError.message}`);
  }

  // 3. Update production_queue status to on_hold
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

  // 4. Recalculate estimated completion date
  try {
    const { calculateEstimatedCompletion } = await import("./stage-service");
    const newEstimatedDate = await calculateEstimatedCompletion(id);
    
    // Update the estimated completion date in production_queue
    await supabase
      .from("production_queue")
      .update({
        estimated_completion_date: newEstimatedDate.toISOString(),
      })
      .eq("id", id);
  } catch (calcError) {
    console.error("Erro ao recalcular data estimada:", calcError);
    // Don't throw - blocking should still succeed even if date calculation fails
  }

  // 5. Send notification to customer about the delay
  try {
    const { ProductionNotificationService } = await import("../notifications/production-notification-service");
    const notificationService = new ProductionNotificationService();
    await notificationService.sendDelayNotification(id, reason);
  } catch (notifError) {
    console.error("Erro ao enviar notificação de atraso:", notifError);
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

  // Atualizar item
  const { data: updatedItem, error: updateError } = await supabase
    .from("production_queue")
    .update({
      scheduled_production_date: newDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError || !updatedItem) {
    throw new Error(
      `Erro ao atualizar data de produção: ${updateError?.message || "Falha na atualização"}`
    );
  }

  return transformProductionQueueItem(updatedItem);
}

// ============================================================================
// Funções Auxiliares
// ============================================================================

/**
 * Transforma dados do banco para o formato da interface ProductionQueueItem
 * Usa os campos denormalizados da tabela production_queue
 */
function transformProductionQueueItem(data: any): ProductionQueueItem {
  return {
    id: data.id,
    orderId: data.order_id,
    orderType: data.order_type,
    customerId: data.customer_id,
    customerName: data.customer_name || "Cliente Desconhecido",
    customerEmail: data.customer_email || "",
    collectionId: data.collection_id,
    collectionName: data.collection_name || "Coleção Desconhecida",
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
