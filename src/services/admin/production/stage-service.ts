/**
 * Serviço de Gestão de Estágios de Produção
 *
 * Este serviço gerencia o histórico de estágios, conclusão de estágios,
 * upload de fotos e cálculo de datas estimadas de conclusão.
 */
import { supabase } from "@/integrations/supabase/client";
import { generateSecureToken, sanitizeFilename } from "@/lib/security/input-sanitizer";
import { callAdminRpc } from "@/services/admin/admin-rpc-gateway";
import { getPublicStorageUrl, uploadStorageFile } from "@/services/supabase/storage-client";
import type { ProductionStageRecord, StageType } from "./stage-types";

// ============================================================================

type ProductionStageRaw = Record<string, unknown>;

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableStringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function nullableNumberValue(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function booleanValue(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
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

  return (data || []).map((stage) => transformStageRecord(stage as ProductionStageRaw));
}

// ============================================================================
// Função: Completar Estágio
// ============================================================================

/**
 * Marca um estágio como completo com notas e fotos opcionais
 *
 * Esta função:
 * 1. Valida que o estágio está em progresso
 * 2. Valida que estágios anteriores foram completados (stage validation)
 * 3. Marca o estágio como completo com timestamp
 * 4. Salva notas e fotos (se fornecidas)
 * 5. Registra a transição no log de auditoria
 * 6. Triggers do banco atualizam automaticamente:
 *    - production_queue.current_stage
 *    - production_queue.production_status
 *    - Calcula actual_duration
 *
 * @param stageId - ID do estágio
 * @param notes - Notas sobre a conclusão (opcional)
 * @param photos - URLs de fotos já uploadadas (opcional)
 * @param isOverride - Se true, permite pular validação (requer admin)
 * @param justification - Justificativa para override (obrigatória se isOverride = true)
 * @returns Registro do estágio atualizado
 */
export async function completeStage(
  stageId: string,
  notes?: string,
  photos?: string[],
  isOverride: boolean = false,
  justification?: string
): Promise<ProductionStageRecord> {
  const data = await callAdminRpc<ProductionStageRaw | null>("admin_complete_production_stage", {
    p_stage_id: stageId,
    p_notes: notes ?? null,
    p_photos: photos ?? [],
    p_is_override: isOverride,
    p_justification: justification ?? null,
  });

  if (!data) {
    throw new Error("Erro ao completar estagio: Falha na atualizacao");
  }

  return transformStageRecord(data);
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
  const safeStageId = sanitizeFilename(stageId) || "stage";
  const extension = sanitizeFilename(file.name.split(".").pop() || "jpg");
  const fileName = `${safeStageId}/${timestamp}-${generateSecureToken(8)}.${extension}`;

  // Upload para Supabase Storage
  const { data, error } = await uploadStorageFile("production-photos", fileName, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(`Erro ao fazer upload da foto: ${error.message}`);
  }

  // Obter URL pública
  return getPublicStorageUrl("production-photos", data.path);
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
function transformStageRecord(data: ProductionStageRaw): ProductionStageRecord {
  return {
    id: stringValue(data.id),
    productionQueueId: stringValue(data.production_queue_id),
    stageName: stringValue(data.stage_name) as StageType,
    stageOrder: numberValue(data.stage_order),
    status: stringValue(data.status) as ProductionStageRecord["status"],
    startedAt: nullableStringValue(data.started_at),
    completedAt: nullableStringValue(data.completed_at),
    estimatedDuration: numberValue(data.estimated_duration),
    actualDuration: nullableNumberValue(data.actual_duration),
    assignedTo: nullableStringValue(data.assigned_to),
    assignedToName: nullableStringValue(data.assigned_to_name),
    assignedAt: nullableStringValue(data.assigned_at),
    notes: nullableStringValue(data.notes),
    photos: stringArrayValue(data.photos),
    isBlocked: booleanValue(data.is_blocked),
    blockReason: nullableStringValue(data.block_reason),
    blockedAt: nullableStringValue(data.blocked_at),
    unblockedAt: nullableStringValue(data.unblocked_at),
    createdAt: stringValue(data.created_at),
    updatedAt: stringValue(data.updated_at),
  };
}
