/**
 * ProductionHistoryModal Component
 *
 * Modal for viewing production queue item history.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useProductionHistory } from "@/hooks/admin/useProductionHistory";

interface ProductionHistoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productionQueueId: string;
}

const stageLabels: Record<string, string> = {
  awaiting_payment: "Aguardando Pagamento",
  payment_confirmed: "Pagamento Confirmado",
  awaiting_choice: "Aguardando Escolha",
  model_preparation: "Preparacao do Modelo",
  printing: "Em Impressao 3D",
  post_processing: "Limpeza e Preparacao",
  painting: "Pintura Artesanal",
  quality_check: "Controle de Qualidade",
  packaging: "Embalagem",
  ready_to_ship: "Pronto para Envio",
  shipped: "Enviado",
  delivered: "Entregue",
  blocked: "Bloqueado",
  design: "Design",
  production: "Producao",
};

export function ProductionHistoryModal({
  isOpen,
  onOpenChange,
  productionQueueId,
}: ProductionHistoryModalProps) {
  const { data: history, isLoading } = useProductionHistory(productionQueueId, isOpen);

  const formatAction = (action: string, oldValue: string | null, newValue: string | null) => {
    switch (action) {
      case "stage_change":
        return `Estagio alterado de "${stageLabels[oldValue || ""] || oldValue}" para "${stageLabels[newValue || ""] || newValue}"`;
      case "assignment":
        return `Atribuido para ${newValue || "ninguem"}`;
      case "blocked":
        return `Item bloqueado: ${newValue}`;
      case "unblocked":
        return "Item desbloqueado";
      case "notes_updated":
        return "Notas de producao atualizadas";
      case "created":
        return "Item criado";
      default:
        return action;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Historico de Producao</DialogTitle>
          <DialogDescription>Visualize todas as alteracoes feitas neste item</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-4">
              {history.map((entry) => (
                <div key={entry.id} className="border-l-2 border-muted pl-4 pb-4 relative">
                  <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-primary" />
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">
                        {formatAction(entry.action, entry.old_value, entry.new_value)}
                      </p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{entry.user_email}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(new Date(entry.created_at), "HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Nenhum historico disponivel para este item
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
