export const PRODUCTION_STAGE_TOTAL = 12;

interface ProductionStageDisplay {
  label: string;
  color: string;
  order: number;
}

const PRODUCTION_STAGE_DISPLAY: Record<string, ProductionStageDisplay> = {
  awaiting_payment: { label: "Aguardando Pagamento", color: "bg-slate-500", order: 1 },
  payment_confirmed: { label: "Pagamento Confirmado", color: "bg-emerald-500", order: 2 },
  awaiting_choice: { label: "Aguardando Escolha", color: "bg-yellow-500", order: 3 },
  model_preparation: { label: "Preparação do Modelo", color: "bg-blue-500", order: 4 },
  printing: { label: "Em Impressão 3D", color: "bg-indigo-500", order: 5 },
  post_processing: { label: "Limpeza e Preparação", color: "bg-violet-500", order: 6 },
  painting: { label: "Pintura Artesanal", color: "bg-pink-500", order: 7 },
  quality_check: { label: "Controle de Qualidade", color: "bg-green-500", order: 8 },
  packaging: { label: "Embalagem", color: "bg-orange-500", order: 9 },
  ready_to_ship: { label: "Pronto para Envio", color: "bg-amber-500", order: 10 },
  shipped: { label: "Enviado", color: "bg-cyan-500", order: 11 },
  delivered: { label: "Entregue", color: "bg-gray-500", order: 12 },

  // Legacy names still appear in older tests and may exist in persisted records.
  design: { label: "Design", color: "bg-blue-500", order: 2 },
  production: { label: "Produção", color: "bg-indigo-500", order: 3 },
};

export function getProductionStageLabel(stageName: string): string {
  return PRODUCTION_STAGE_DISPLAY[stageName]?.label ?? stageName;
}

export function getProductionStageColor(stageName: string): string {
  return PRODUCTION_STAGE_DISPLAY[stageName]?.color ?? "bg-gray-500";
}

export function getProductionStageOrder(stageName: string): number | undefined {
  return PRODUCTION_STAGE_DISPLAY[stageName]?.order;
}
