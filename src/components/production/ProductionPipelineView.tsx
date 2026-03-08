// @ts-nocheck
/**
 * ProductionPipelineView - Visual Pipeline Layout
 * 
 * Layout visual com:
 * - Cada estágio como uma linha horizontal
 * - Imagens de personagens agrupadas com badge de quantidade
 * - Modal com lista de clientes ao clicar na imagem
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Package, User, Calendar, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchProductionQueue,
  STAGE_LABELS,
  type ProductionFilters,
  type ProductionStage,
  type ProductionQueueItem,
} from "@/services/admin/production-service";

interface ProductionPipelineViewProps {
  filters: ProductionFilters;
}

interface GroupedCharacter {
  characterId: string | null;
  characterName: string | null;
  collectionId: string;
  collectionName: string;
  imageUrl: string | null;
  count: number;
  items: ProductionQueueItem[];
  hasCritical: boolean;
}

// Estágios de produção ativos (excluindo pagamento e entrega final)
const PIPELINE_STAGES: ProductionStage[] = [
  "awaiting_choice",
  "model_preparation",
  "printing",
  "post_processing",
  "painting",
  "quality_check",
  "packaging",
  "ready_to_ship",
];

// Cores por estágio
const STAGE_COLORS: Record<ProductionStage, string> = {
  awaiting_payment: "border-muted-foreground/30",
  payment_confirmed: "border-muted-foreground/30",
  awaiting_choice: "border-amber-500/50",
  model_preparation: "border-blue-500/50",
  printing: "border-purple-500/50",
  post_processing: "border-cyan-500/50",
  painting: "border-pink-500/50",
  quality_check: "border-orange-500/50",
  packaging: "border-emerald-500/50",
  ready_to_ship: "border-green-500/50",
  shipped: "border-muted-foreground/30",
  delivered: "border-muted-foreground/30",
};

const STAGE_BG_COLORS: Record<ProductionStage, string> = {
  awaiting_payment: "bg-muted/30",
  payment_confirmed: "bg-muted/30",
  awaiting_choice: "bg-amber-500/10",
  model_preparation: "bg-blue-500/10",
  printing: "bg-purple-500/10",
  post_processing: "bg-cyan-500/10",
  painting: "bg-pink-500/10",
  quality_check: "bg-orange-500/10",
  packaging: "bg-emerald-500/10",
  ready_to_ship: "bg-green-500/10",
  shipped: "bg-muted/30",
  delivered: "bg-muted/30",
};

export function ProductionPipelineView({ filters }: ProductionPipelineViewProps) {
  const [selectedGroup, setSelectedGroup] = useState<GroupedCharacter | null>(null);

  // Fetch production queue
  const { data: queueData, isLoading } = useQuery({
    queryKey: ["production-queue", filters],
    queryFn: () => fetchProductionQueue(filters, { page: 1, pageSize: 1000 }),
  });

  // Agrupar itens por estágio e depois por personagem
  const stageGroups = useMemo(() => {
    if (!queueData?.data) return new Map<ProductionStage, GroupedCharacter[]>();

    const groups = new Map<ProductionStage, Map<string, GroupedCharacter>>();

    // Inicializar todos os estágios
    PIPELINE_STAGES.forEach((stage) => {
      groups.set(stage, new Map());
    });

    // Processar itens
    queueData.data.forEach((item) => {
      if (!PIPELINE_STAGES.includes(item.currentStage)) return;

      const stageMap = groups.get(item.currentStage);
      if (!stageMap) return;

      // Chave única: personagem + coleção
      const key = `${item.characterId || "no-char"}_${item.collectionId || "no-collection"}`;

      if (!stageMap.has(key)) {
        stageMap.set(key, {
          characterId: item.characterId,
          characterName: item.characterName || "Personagem não definido",
          collectionId: item.collectionId,
          collectionName: item.collectionName,
          imageUrl: null, // Podemos adicionar depois
          count: 0,
          items: [],
          hasCritical: false,
        });
      }

      const group = stageMap.get(key)!;
      group.count++;
      group.items.push(item);
      if (item.priority === "critical" || item.priority === "high") {
        group.hasCritical = true;
      }
    });

    // Converter para array ordenado por quantidade (maior primeiro)
    const result = new Map<ProductionStage, GroupedCharacter[]>();
    groups.forEach((charMap, stage) => {
      const chars = Array.from(charMap.values()).sort((a, b) => b.count - a.count);
      result.set(stage, chars);
    });

    return result;
  }, [queueData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {PIPELINE_STAGES.slice(0, 4).map((stage) => (
          <div key={stage} className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-20 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {PIPELINE_STAGES.map((stage) => {
        const characters = stageGroups.get(stage) || [];
        const totalItems = characters.reduce((sum, c) => sum + c.count, 0);

        return (
          <div
            key={stage}
            className={cn(
              "rounded-lg border-2 p-4 transition-colors",
              STAGE_COLORS[stage],
              STAGE_BG_COLORS[stage]
            )}
          >
            {/* Header do estágio */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm uppercase tracking-wider">
                  {STAGE_LABELS[stage]}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {totalItems} {totalItems === 1 ? "item" : "itens"}
                </Badge>
              </div>
            </div>

            {/* Grid de personagens */}
            {characters.length > 0 ? (
              <ScrollArea className="w-full">
                <div className="flex gap-3 pb-2">
                  {characters.map((group, idx) => (
                    <CharacterCard
                      key={`${group.characterId}-${group.collectionId}-${idx}`}
                      group={group}
                      onClick={() => setSelectedGroup(group)}
                    />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-16 text-muted-foreground text-sm">
                <Package className="h-4 w-4 mr-2 opacity-50" />
                Nenhum item neste estágio
              </div>
            )}
          </div>
        );
      })}

      {/* Modal de detalhes */}
      <CustomerListModal
        group={selectedGroup}
        onClose={() => setSelectedGroup(null)}
      />
    </div>
  );
}

// Card de personagem agrupado
function CharacterCard({
  group,
  onClick,
}: {
  group: GroupedCharacter;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex-shrink-0 w-20 h-24 rounded-lg border-2 overflow-hidden",
        "transition-all hover:scale-105 hover:shadow-lg",
        "bg-card hover:border-primary/50",
        group.hasCritical && "ring-2 ring-red-500 ring-offset-2 ring-offset-background"
      )}
    >
      {/* Imagem placeholder ou inicial do nome */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
        <span className="text-2xl font-bold text-muted-foreground/50">
          {group.characterName?.charAt(0)?.toUpperCase() || "?"}
        </span>
      </div>

      {/* Badge de quantidade */}
      {group.count > 1 && (
        <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {group.count}×
        </div>
      )}

      {/* Indicador de urgência */}
      {group.hasCritical && (
        <div className="absolute top-1 left-1">
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </div>
      )}

      {/* Nome do personagem */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
        <p className="text-[10px] text-white font-medium truncate leading-tight">
          {group.characterName || "N/A"}
        </p>
      </div>
    </button>
  );
}

// Modal com lista de clientes
function CustomerListModal({
  group,
  onClose,
}: {
  group: GroupedCharacter | null;
  onClose: () => void;
}) {
  if (!group) return null;

  // Ordenar por prioridade
  const sortedItems = [...group.items].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  });

  return (
    <Dialog open={!!group} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {group.characterName || "Personagem"}
            <Badge variant="secondary">{group.count}×</Badge>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {group.collectionName}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-2">
            {sortedItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "p-3 rounded-lg border bg-card",
                  item.priority === "critical" && "border-red-500/50 bg-red-500/5",
                  item.priority === "high" && "border-orange-500/50 bg-orange-500/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">{item.customerName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {item.customerEmail}
                    </p>
                  </div>
                  <PriorityBadge priority={item.priority} />
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="font-mono">#{item.orderId.slice(0, 8)}</span>
                  {item.estimatedCompletionDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.estimatedCompletionDate).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    critical: { label: "Crítico", className: "bg-red-500 text-white" },
    high: { label: "Alto", className: "bg-orange-500 text-white" },
    normal: { label: "Normal", className: "bg-muted text-muted-foreground" },
    low: { label: "Baixo", className: "bg-muted/50 text-muted-foreground" },
  };

  const variant = variants[priority] || variants.normal;

  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", variant.className)}>
      {variant.label}
    </span>
  );
}
