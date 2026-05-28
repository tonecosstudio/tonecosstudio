import type { ProductionStage } from "@/types/production";

export const PRODUCTION_STAGE_ORDER: ProductionStage[] = [
  "awaiting_payment",
  "payment_confirmed",
  "awaiting_choice",
  "model_preparation",
  "printing",
  "post_processing",
  "painting",
  "quality_check",
  "packaging",
  "ready_to_ship",
  "shipped",
  "delivered",
];

export const PRODUCTION_STAGE_TOTAL = PRODUCTION_STAGE_ORDER.length;

export interface ProductionStageDisplay {
  label: string;
  color: string;
  order: number;
}

export const PRODUCTION_STAGE_LABELS: Record<ProductionStage, string> = {
  awaiting_payment: "Aguardando Pagamento",
  payment_confirmed: "Pagamento Confirmado",
  awaiting_choice: "Aguardando Escolha",
  model_preparation: "Preparação do Modelo",
  printing: "Em Impressão 3D",
  post_processing: "Limpeza e Preparação",
  painting: "Pintura Artesanal",
  quality_check: "Controle de Qualidade",
  packaging: "Embalagem",
  ready_to_ship: "Pronto para Envio",
  shipped: "Enviado",
  delivered: "Entregue",
};

export const PRODUCTION_STAGE_DISPLAY: Record<string, ProductionStageDisplay> = {
  awaiting_payment: { label: PRODUCTION_STAGE_LABELS.awaiting_payment, color: "bg-slate-500", order: 1 },
  payment_confirmed: { label: PRODUCTION_STAGE_LABELS.payment_confirmed, color: "bg-emerald-500", order: 2 },
  awaiting_choice: { label: PRODUCTION_STAGE_LABELS.awaiting_choice, color: "bg-yellow-500", order: 3 },
  model_preparation: { label: PRODUCTION_STAGE_LABELS.model_preparation, color: "bg-blue-500", order: 4 },
  printing: { label: PRODUCTION_STAGE_LABELS.printing, color: "bg-indigo-500", order: 5 },
  post_processing: { label: PRODUCTION_STAGE_LABELS.post_processing, color: "bg-violet-500", order: 6 },
  painting: { label: PRODUCTION_STAGE_LABELS.painting, color: "bg-pink-500", order: 7 },
  quality_check: { label: PRODUCTION_STAGE_LABELS.quality_check, color: "bg-green-500", order: 8 },
  packaging: { label: PRODUCTION_STAGE_LABELS.packaging, color: "bg-orange-500", order: 9 },
  ready_to_ship: { label: PRODUCTION_STAGE_LABELS.ready_to_ship, color: "bg-amber-500", order: 10 },
  shipped: { label: PRODUCTION_STAGE_LABELS.shipped, color: "bg-cyan-500", order: 11 },
  delivered: { label: PRODUCTION_STAGE_LABELS.delivered, color: "bg-gray-500", order: 12 },

  // Legacy stage names may still exist in older persisted records and fixtures.
  design: { label: "Design", color: "bg-blue-500", order: 4 },

  // Stage status aliases used by history and analytics displays.
  blocked: { label: "Bloqueado", color: "bg-red-500", order: 0 },
  production: { label: "Produção", color: "bg-indigo-500", order: 5 },
};

const LEGACY_FORWARD_TRANSITIONS = new Map<string, Set<string>>([
  ["awaiting_choice", new Set(["design"])],
  ["design", new Set(["production"])],
  ["production", new Set(["quality_check"])],
]);

export function getProductionStageLabel(stageName: string): string {
  return PRODUCTION_STAGE_DISPLAY[stageName]?.label ?? stageName;
}

export function getProductionStageColor(stageName: string): string {
  return PRODUCTION_STAGE_DISPLAY[stageName]?.color ?? "bg-gray-500";
}

export function getProductionStageOrder(stageName: string): number | undefined {
  return PRODUCTION_STAGE_DISPLAY[stageName]?.order;
}

export function isForwardProductionStageTransition(
  currentStage: string | null,
  newStage: string
): boolean {
  if (!currentStage) return false;
  if (currentStage === newStage) return true;

  const legacyNextStages = LEGACY_FORWARD_TRANSITIONS.get(currentStage);
  if (legacyNextStages?.has(newStage)) {
    return true;
  }

  if (legacyNextStages || LEGACY_FORWARD_TRANSITIONS.has(newStage)) {
    return false;
  }

  const currentOrder = getProductionStageOrder(currentStage);
  const newOrder = getProductionStageOrder(newStage);

  return currentOrder !== undefined && newOrder !== undefined && newOrder === currentOrder + 1;
}
