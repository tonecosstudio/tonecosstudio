import { Badge } from "@/components/ui/badge";

interface StageDistributionChartProps {
  data: Record<string, number>;
}

const stageLabels: Record<string, string> = {
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
  blocked: "Bloqueado",
};

const stageColors: Record<string, string> = {
  awaiting_payment: "bg-slate-500",
  payment_confirmed: "bg-emerald-500",
  awaiting_choice: "bg-yellow-500",
  model_preparation: "bg-blue-500",
  printing: "bg-indigo-500",
  post_processing: "bg-violet-500",
  painting: "bg-pink-500",
  quality_check: "bg-green-500",
  packaging: "bg-orange-500",
  ready_to_ship: "bg-amber-500",
  shipped: "bg-cyan-500",
  delivered: "bg-gray-500",
  blocked: "bg-red-500",
};

export function StageDistributionChart({ data }: StageDistributionChartProps) {
  const total = Object.values(data).reduce((sum, count) => sum + count, 0);
  const sortedEntries = Object.entries(data).sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-4">
      {/* Bar Chart */}
      <div className="space-y-3">
        {sortedEntries.map(([stage, count]) => {
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={stage} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {stageLabels[stage] || stage}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {percentage.toFixed(0)}%
                  </span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${stageColors[stage] || "bg-gray-500"} transition-all`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Total de Itens</span>
          <Badge variant="default" className="text-base">
            {total}
          </Badge>
        </div>
      </div>
    </div>
  );
}
