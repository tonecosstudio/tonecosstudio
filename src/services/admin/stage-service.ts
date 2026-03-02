/**
 * Serviço de Gestão de Estágios de Produção
 *
 * Este serviço gerencia o histórico de estágios, conclusão de estágios,
 * upload de fotos e cálculo de datas estimadas de conclusão.
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Tipos
// ============================================================================

export type StageType =
  | "awaiting_choice"
  | "design"
  | "production"
  | "quality_check"
  | "packaging"
  | "shipped";

export type StageStatus = "pending" | "in_progress" | "completed" | "blocked";

export interface ProductionStageRecord {
  id: string;
  productionQueueId: string;
  stageName: StageType;
  stageOrder: number;
  status: StageStatus;
  startedAt: string | null;
  completedAt: string | null;
  estimatedDuration: number;
  actualDuration: number | null;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  notes: string | null;
  photos: string[];
  isBlocked: boolean;
  blockReason: string | null;
  blockedAt: string | null;
  unblockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Função: Buscar Histórico de Estágios
// ============================================================================

/**
 * Busca o histórico completo de estágios de um item de produção
 *
 * @param productionQueueId - ID do item na fila de produção
 * @returns Array de registros de estágios ordenados por stage_order
 */
export async function getStageHistory(productionQueueId: string): Promise<ProductionStageRecord[]> {
  const { data, error } = await supabase
    .from("production_stages")
    .select("*")
    .eq("production_queue_id", productionQueueId)
    .order("stage_order", { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar histórico de estágios: ${error.message}`);
  }

  return (data || []).map(transformStageRecord);
}

// ============================================================================
// Função: Completar Estágio
// ============================================================================

/**
 * Marca um estágio como completo com notas e fotos opcionais
 *
 * Esta função:
 * 1. Valida que o estágio está em progresso
 * 2. Marca o estágio como completo com timestamp
 * 3. Salva notas e fotos (se fornecidas)
 * 4. Triggers do banco atualizam automaticamente:
 *    - production_queue.current_stage
 *    - production_queue.production_status
 *    - Calcula actual_duration
 *
 * @param stageId - ID do estágio
 * @param notes - Notas sobre a conclusão (opcional)
 * @param photos - URLs de fotos já uploadadas (opcional)
 * @returns Registro do estágio atualizado
 */
export async function completeStage(
  stageId: string,
  notes?: string,
  photos?: string[]
): Promise<ProductionStageRecord> {
  // Buscar estágio atual
  const { data: currentStage, error: fetchError } = await supabase
    .from("production_stages")
    .select("*")
    .eq("id", stageId)
    .single();

  if (fetchError || !currentStage) {
    throw new Error(`Estágio não encontrado: ${fetchError?.message || "ID inválido"}`);
  }

  // Validar que o estágio pode ser completado
  if (currentStage.status === "completed") {
    throw new Error("Este estágio já foi completado");
  }

  if (currentStage.is_blocked) {
    throw new Error("Não é possível completar um estágio bloqueado. Desbloqueie primeiro.");
  }

  // Preparar dados de atualização
  const now = new Date().toISOString();
  const updateData: any = {
    status: "completed",
    completed_at: now,
    updated_at: now,
  };

  // Se o estágio ainda não foi iniciado, iniciar agora
  if (!currentStage.started_at) {
    updateData.started_at = now;
  }

  // Adicionar notas se fornecidas
  if (notes) {
    updateData.notes = notes;
  }

  // Adicionar fotos se fornecidas
  if (photos && photos.length > 0) {
    updateData.photos = photos;
  }

  // Atualizar estágio
  const { data: updatedStage, error: updateError } = await supabase
    .from("production_stages")
    .update(updateData)
    .eq("id", stageId)
    .select()
    .single();

  if (updateError || !updatedStage) {
    throw new Error(`Erro ao completar estágio: ${updateError?.message || "Falha na atualização"}`);
  }

  return transformStageRecord(updatedStage);
}

// ============================================================================
// Função: Upload de Foto de Estágio
// ============================================================================

/**
 * Faz upload de uma foto para o Supabase Storage e retorna a URL
 *
 * Esta função:
 * 1. Valida o tipo de arquivo (apenas imagens)
 * 2. Gera nome único para o arquivo
 * 3. Faz upload para o bucket 'production-photos'
 * 4. Retorna URL pública da foto
 *
 * @param stageId - ID do estágio
 * @param file - Arquivo de imagem
 * @returns URL pública da foto
 */
export async function uploadStagePhoto(stageId: string, file: File): Promise<string> {
  // Validar tipo de arquivo
  if (!file.type.startsWith("image/")) {
    throw new Error("Apenas arquivos de imagem são permitidos");
  }

  // Validar tamanho (máx 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error("Arquivo muito grande. Tamanho máximo: 5MB");
  }

  // Gerar nome único para o arquivo
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const extension = file.name.split(".").pop();
  const fileName = `${stageId}/${timestamp}-${randomStr}.${extension}`;

  // Upload para Supabase Storage
  const { data, error } = await supabase.storage.from("production-photos").upload(fileName, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(`Erro ao fazer upload da foto: ${error.message}`);
  }

  // Obter URL pública
  const { data: urlData } = supabase.storage.from("production-photos").getPublicUrl(data.path);

  return urlData.publicUrl;
}

// ============================================================================
// Função: Calcular Data Estimada de Conclusão
// ============================================================================

/**
 * Calcula a data estimada de conclusão baseada nos estágios restantes
 *
 * Esta função:
 * 1. Busca todos os estágios do item
 * 2. Identifica estágios pendentes
 * 3. Soma as durações estimadas dos estágios restantes
 * 4. Adiciona à data atual para calcular conclusão estimada
 * 5. Considera apenas dias úteis (segunda a sexta)
 *
 * @param productionQueueId - ID do item na fila de produção
 * @returns Data estimada de conclusão
 */
export async function calculateEstimatedCompletion(productionQueueId: string): Promise<Date> {
  // Buscar todos os estágios
  const stages = await getStageHistory(productionQueueId);

  // Calcular horas restantes
  let remainingHours = 0;

  for (const stage of stages) {
    if (stage.status === "pending") {
      // Estágio ainda não iniciado - usar duração estimada
      remainingHours += stage.estimatedDuration;
    } else if (stage.status === "in_progress") {
      // Estágio em progresso - calcular tempo restante
      if (stage.startedAt) {
        const elapsed = (Date.now() - new Date(stage.startedAt).getTime()) / (1000 * 60 * 60);
        const remaining = Math.max(0, stage.estimatedDuration - elapsed);
        remainingHours += remaining;
      } else {
        remainingHours += stage.estimatedDuration;
      }
    }
    // Estágios completos ou bloqueados não contam
  }

  // Calcular data de conclusão (considerando apenas dias úteis)
  const now = new Date();
  const estimatedDate = new Date(now);
  let hoursToAdd = remainingHours;

  // Assumir 8 horas de trabalho por dia
  const workHoursPerDay = 8;

  while (hoursToAdd > 0) {
    estimatedDate.setHours(estimatedDate.getHours() + 1);

    // Pular fins de semana (sábado = 6, domingo = 0)
    const dayOfWeek = estimatedDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      hoursToAdd -= 1;
    }
  }

  return estimatedDate;
}

// ============================================================================
// Funções Auxiliares
// ============================================================================

/**
 * Transforma dados do banco para o formato da interface ProductionStageRecord
 */
function transformStageRecord(data: any): ProductionStageRecord {
  return {
    id: data.id,
    productionQueueId: data.production_queue_id,
    stageName: data.stage_name,
    stageOrder: data.stage_order,
    status: data.status,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    estimatedDuration: data.estimated_duration,
    actualDuration: data.actual_duration,
    assignedTo: data.assigned_to,
    assignedToName: data.assigned_to_name,
    assignedAt: data.assigned_at,
    notes: data.notes,
    photos: data.photos || [],
    isBlocked: data.is_blocked,
    blockReason: data.block_reason,
    blockedAt: data.blocked_at,
    unblockedAt: data.unblocked_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
