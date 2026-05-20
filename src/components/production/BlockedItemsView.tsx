import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBlockedProductionItems } from "@/hooks/admin/useBlockedProductionItems";
import type { Priority, ProductionStage } from "@/types/production";
import { UnblockProductionModal } from "./UnblockProductionModal";

const STAGE_LABELS: Record<ProductionStage, string> = {
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
};

const PRIORITY_CLASSES: Record<Priority, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  normal: "bg-blue-500 text-white",
  low: "bg-gray-500 text-white",
};

export function BlockedItemsView() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false);
  const { data: blockedItems, isLoading, refetch } = useBlockedProductionItems();

  const handleUnblockClick = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsUnblockModalOpen(true);
  };

  const handleUnblockSuccess = () => {
    void refetch();
  };

  if (isLoading) {
    return <BlockedItemsViewSkeleton />;
  }

  if (!blockedItems || blockedItems.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-green-50 dark:bg-green-950/20">
        <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 dark:text-green-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2 text-green-700 dark:text-green-400">
          Nenhum Item Bloqueado
        </h3>
        <p className="text-muted-foreground">
          Nao ha itens de producao bloqueados no momento.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="text-xl font-semibold">Itens Bloqueados</h2>
            <Badge variant="destructive" className="ml-2">
              {blockedItems.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Ordenado por tempo bloqueado (maior primeiro)
          </p>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Colecao</TableHead>
                <TableHead>Personagem</TableHead>
                <TableHead>Estagio</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Motivo do Bloqueio</TableHead>
                <TableHead>Bloqueado em</TableHead>
                <TableHead>Duracao</TableHead>
                <TableHead>Responsavel</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blockedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.customerName}</span>
                      <span className="text-xs text-muted-foreground">{item.customerEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.collectionName}</TableCell>
                  <TableCell>{item.characterName || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{STAGE_LABELS[item.currentStage]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={PRIORITY_CLASSES[item.priority]}>
                      {item.priority.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="text-sm line-clamp-2" title={item.blockReason}>
                        {item.blockReason}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {formatBlockedDate(item.blockedAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.blockedDurationHours > 48
                          ? "border-red-500 text-red-700 dark:text-red-400"
                          : item.blockedDurationHours > 24
                            ? "border-orange-500 text-orange-700 dark:text-orange-400"
                            : ""
                      }
                    >
                      {formatBlockedDuration(item.blockedDurationHours)}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.assignedToName || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleUnblockClick(item.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Desbloquear
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedItemId && (
        <UnblockProductionModal
          isOpen={isUnblockModalOpen}
          onOpenChange={setIsUnblockModalOpen}
          productionQueueId={selectedItemId}
          onUnblock={handleUnblockSuccess}
        />
      )}
    </>
  );
}

function formatBlockedDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} minutos`;
  }

  if (hours < 24) {
    return `${Math.round(hours)} horas`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);

  return remainingHours > 0
    ? `${days} ${days === 1 ? "dia" : "dias"} e ${remainingHours} ${
        remainingHours === 1 ? "hora" : "horas"
      }`
    : `${days} ${days === 1 ? "dia" : "dias"}`;
}

function formatBlockedDate(date: string): string {
  try {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "-";
  }
}

function BlockedItemsViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-8" />
        </div>
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Colecao</TableHead>
              <TableHead>Personagem</TableHead>
              <TableHead>Estagio</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Motivo do Bloqueio</TableHead>
              <TableHead>Bloqueado em</TableHead>
              <TableHead>Duracao</TableHead>
              <TableHead>Responsavel</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-8 w-28 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default BlockedItemsView;
