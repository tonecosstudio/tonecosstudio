/**
 * Componente para exibir timeline de escolhas mensais
 * Organizado por status: Entregues, Em Produção, Na Fila
 */
import { CheckCircle2, Clock, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MonthlySelection {
  id: string;
  delivery_month: string;
  status: string;
  coins_spent: number;
  is_auto_selected: boolean;
  character?: { name: string; image_url?: string } | null;
  collection?: { name: string } | null;
}

interface MonthlySelectionsTimelineProps {
  selections: MonthlySelection[];
}

export function MonthlySelectionsTimeline({ selections }: MonthlySelectionsTimelineProps) {
  if (selections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhuma escolha registrada
      </p>
    );
  }

  // Organizar por status e ordenar por data
  const delivered = selections
    .filter((s) => s.status === "delivered")
    .sort((a, b) => a.delivery_month.localeCompare(b.delivery_month));
  
  const inProduction = selections
    .filter((s) => ["confirmed", "in_production", "shipped"].includes(s.status))
    .sort((a, b) => a.delivery_month.localeCompare(b.delivery_month));
  
  const pending = selections
    .filter((s) => s.status === "pending")
    .sort((a, b) => a.delivery_month.localeCompare(b.delivery_month));

  const formatMonth = (deliveryMonth: string) => {
    // deliveryMonth está no formato "YYYY-MM"
    const [year, month] = deliveryMonth.split("-");
    // Criar data no timezone local para evitar problemas de conversão
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  };

  const getReferenceMonth = (deliveryMonth: string) => {
    // Calcular mês de referência (2 meses antes do envio)
    const [year, month] = deliveryMonth.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    date.setMonth(date.getMonth() - 2); // Voltar 2 meses
    return date.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  };

  const renderSelection = (selection: MonthlySelection, statusConfig: any) => (
    <div
      key={selection.id}
      className={`flex items-center justify-between p-3 rounded-lg border ${statusConfig.bgClass}`}
    >
      <div className="flex items-center gap-3 flex-1">
        {/* Imagem do personagem */}
        {selection.character?.image_url && (
          <div className="flex-shrink-0">
            <img
              src={selection.character.image_url}
              alt={selection.character.name}
              className="w-12 h-12 rounded-lg object-cover border-2 border-border"
            />
          </div>
        )}
        
        {/* Informações do personagem */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">
            {selection.character?.name || "Personagem"}
          </div>
          <div className="text-xs text-muted-foreground">
            {selection.collection?.name} • {selection.coins_spent} coins
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            <span className="font-medium">Ref: {getReferenceMonth(selection.delivery_month)}</span>
            {" • "}
            {statusConfig.label}: {formatMonth(selection.delivery_month)}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {selection.is_auto_selected && (
          <Badge variant="secondary" className="text-xs">
            Auto
          </Badge>
        )}
        <Badge variant="outline" className={statusConfig.badgeClass}>
          {statusConfig.icon}
          {statusConfig.text}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Entregues */}
      {delivered.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <h4 className="font-semibold text-sm">Entregues ({delivered.length})</h4>
          </div>
          <div className="space-y-2 ml-6">
            {delivered.map((selection) =>
              renderSelection(selection, {
                bgClass: "bg-green-50 dark:bg-green-950/20",
                badgeClass: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
                icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
                text: "Entregue",
                label: "Entregue em",
              })
            )}
          </div>
        </div>
      )}

      {/* Em Produção */}
      {inProduction.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-blue-600" />
            <h4 className="font-semibold text-sm">Em Produção ({inProduction.length})</h4>
          </div>
          <div className="space-y-2 ml-6">
            {inProduction.map((selection) =>
              renderSelection(selection, {
                bgClass: "bg-blue-50 dark:bg-blue-950/20",
                badgeClass: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
                icon: <Clock className="h-3 w-3 mr-1" />,
                text:
                  selection.status === "shipped"
                    ? "Enviado"
                    : selection.status === "confirmed"
                    ? "Confirmado"
                    : "Produzindo",
                label: "Envio previsto",
              })
            )}
          </div>
        </div>
      )}

      {/* Na Fila */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Truck className="h-4 w-4 text-amber-600" />
            <h4 className="font-semibold text-sm">Na Fila ({pending.length})</h4>
          </div>
          <div className="space-y-2 ml-6">
            {pending.map((selection) =>
              renderSelection(selection, {
                bgClass: "bg-amber-50 dark:bg-amber-950/20",
                badgeClass: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
                icon: <Truck className="h-3 w-3 mr-1" />,
                text: "Na Fila",
                label: "Envio previsto",
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
