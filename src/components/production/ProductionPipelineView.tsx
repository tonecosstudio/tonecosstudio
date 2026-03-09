// @ts-nocheck
/**
 * ProductionPipelineView - Visual Pipeline Layout with Drag & Drop
 * 
 * Layout visual com:
 * - Cada estágio como uma linha horizontal
 * - Imagens de personagens agrupadas com badge de quantidade
 * - Drag & drop de cards entre estágios para mover rapidamente
 * - Modal com lista de clientes ao clicar na imagem
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Package, User, Calendar, AlertTriangle, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  fetchProductionQueue,
  updateProductionStage,
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
  groupKey: string;
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

const STAGE_DROP_HIGHLIGHT: Record<ProductionStage, string> = {
  awaiting_payment: "ring-muted-foreground/50",
  payment_confirmed: "ring-muted-foreground/50",
  awaiting_choice: "ring-amber-500",
  model_preparation: "ring-blue-500",
  printing: "ring-purple-500",
  post_processing: "ring-cyan-500",
  painting: "ring-pink-500",
  quality_check: "ring-orange-500",
  packaging: "ring-emerald-500",
  ready_to_ship: "ring-green-500",
  shipped: "ring-muted-foreground/50",
  delivered: "ring-muted-foreground/50",
};

export function ProductionPipelineView({ filters }: ProductionPipelineViewProps) {
  const [selectedGroup, setSelectedGroup] = useState<GroupedCharacter | null>(null);
  const [activeGroup, setActiveGroup] = useState<GroupedCharacter | null>(null);
  const [movingItems, setMovingItems] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Fetch production queue
  const { data: queueData, isLoading } = useQuery({
    queryKey: ["production-queue", filters],
    queryFn: () => fetchProductionQueue(filters, { page: 1, pageSize: 1000 }),
  });

  // Agrupar itens por estágio e depois por personagem
  const stageGroups = useMemo(() => {
    if (!queueData?.data) return new Map<ProductionStage, GroupedCharacter[]>();

    const groups = new Map<ProductionStage, Map<string, GroupedCharacter>>();

    PIPELINE_STAGES.forEach((stage) => {
      groups.set(stage, new Map());
    });

    queueData.data.forEach((item) => {
      if (!PIPELINE_STAGES.includes(item.currentStage)) return;

      const stageMap = groups.get(item.currentStage);
      if (!stageMap) return;

      const key = `${item.characterId || "no-char"}_${item.collectionId || "no-collection"}`;
      const groupKey = `${item.currentStage}__${key}`;

      if (!stageMap.has(key)) {
        stageMap.set(key, {
          characterId: item.characterId,
          characterName: item.characterName || "Personagem não definido",
          collectionId: item.collectionId,
          collectionName: item.collectionName,
          imageUrl: null,
          count: 0,
          items: [],
          hasCritical: false,
          groupKey,
        });
      }

      const group = stageMap.get(key)!;
      group.count++;
      group.items.push(item);
      if (item.priority === "critical" || item.priority === "high") {
        group.hasCritical = true;
      }
    });

    const result = new Map<ProductionStage, GroupedCharacter[]>();
    groups.forEach((charMap, stage) => {
      const chars = Array.from(charMap.values()).sort((a, b) => b.count - a.count);
      result.set(stage, chars);
    });

    return result;
  }, [queueData]);

  const handleDragStart = (event: DragStartEvent) => {
    const group = event.active.data.current?.group as GroupedCharacter | undefined;
    if (group) {
      setActiveGroup(group);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveGroup(null);

    const { active, over } = event;
    if (!over) return;

    const group = active.data.current?.group as GroupedCharacter | undefined;
    const targetStage = over.id as ProductionStage;

    if (!group || !PIPELINE_STAGES.includes(targetStage)) return;

    // Get source stage from the groupKey
    const sourceStage = group.groupKey.split("__")[0] as ProductionStage;
    if (sourceStage === targetStage) return;

    const itemIds = group.items.map((i) => i.id);
    setMovingItems(new Set(itemIds));

    try {
      // Move all items in the group
      await Promise.all(
        itemIds.map((id) => updateProductionStage(id, targetStage))
      );

      toast({
        title: "Estágio atualizado",
        description: `${group.count} ${group.count === 1 ? "item movido" : "itens movidos"} para ${STAGE_LABELS[targetStage]}`,
      });

      queryClient.invalidateQueries({ queryKey: ["production-queue"] });
    } catch (error) {
      console.error("Erro ao mover itens:", error);
      toast({
        title: "Erro",
        description: "Não foi possível mover os itens. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setMovingItems(new Set());
    }
  };

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
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {PIPELINE_STAGES.map((stage) => {
          const characters = stageGroups.get(stage) || [];
          const totalItems = characters.reduce((sum, c) => sum + c.count, 0);

          return (
            <StageRow
              key={stage}
              stage={stage}
              characters={characters}
              totalItems={totalItems}
              onCardClick={setSelectedGroup}
              isDragging={!!activeGroup}
              movingItems={movingItems}
            />
          );
        })}
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeGroup && (
          <div className="opacity-90 scale-105">
            <CharacterCardStatic group={activeGroup} />
          </div>
        )}
      </DragOverlay>

      {/* Modal de detalhes */}
      <CustomerListModal
        group={selectedGroup}
        onClose={() => setSelectedGroup(null)}
      />
    </DndContext>
  );
}

// Droppable stage row
function StageRow({
  stage,
  characters,
  totalItems,
  onCardClick,
  isDragging,
  movingItems,
}: {
  stage: ProductionStage;
  characters: GroupedCharacter[];
  totalItems: number;
  onCardClick: (g: GroupedCharacter) => void;
  isDragging: boolean;
  movingItems: Set<string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border-2 p-4 transition-all duration-200",
        STAGE_COLORS[stage],
        STAGE_BG_COLORS[stage],
        isDragging && "ring-2 ring-offset-2 ring-offset-background ring-dashed",
        isDragging && STAGE_DROP_HIGHLIGHT[stage],
        isOver && "ring-4 scale-[1.01] shadow-lg",
        isOver && "bg-opacity-30"
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
        {isOver && (
          <Badge className="bg-primary text-primary-foreground text-xs animate-pulse">
            Soltar aqui
          </Badge>
        )}
      </div>

      {/* Grid de personagens */}
      {characters.length > 0 ? (
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {characters.map((group, idx) => (
              <DraggableCharacterCard
                key={`${group.groupKey}-${idx}`}
                group={group}
                onClick={() => onCardClick(group)}
                isMoving={group.items.some((i) => movingItems.has(i.id))}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className={cn(
          "flex items-center justify-center h-16 text-muted-foreground text-sm rounded-md transition-colors",
          isOver && "bg-primary/10 border-2 border-dashed border-primary/30"
        )}>
          <Package className="h-4 w-4 mr-2 opacity-50" />
          {isOver ? "Solte para mover para este estágio" : "Nenhum item neste estágio"}
        </div>
      )}
    </div>
  );
}

// Draggable character card wrapper
function DraggableCharacterCard({
  group,
  onClick,
  isMoving,
}: {
  group: GroupedCharacter;
  onClick: () => void;
  isMoving: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: group.groupKey,
    data: { group },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative",
        isDragging && "opacity-30",
        isMoving && "opacity-50 pointer-events-none animate-pulse"
      )}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute -top-1 -left-1 z-10 p-1 rounded-full bg-muted/80 backdrop-blur cursor-grab active:cursor-grabbing opacity-0 group-hover/card:opacity-100 hover:opacity-100 transition-opacity"
        style={{ touchAction: "none" }}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      <CharacterCardInteractive group={group} onClick={onClick} />
    </div>
  );
}

// Interactive card (click to open modal)
function CharacterCardInteractive({
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
        "group/card relative flex-shrink-0 w-20 h-24 rounded-lg border-2 overflow-hidden",
        "transition-all hover:scale-105 hover:shadow-lg",
        "bg-card hover:border-primary/50",
        group.hasCritical && "ring-2 ring-red-500 ring-offset-2 ring-offset-background"
      )}
    >
      <CardContent group={group} />
    </button>
  );
}

// Static card for DragOverlay
function CharacterCardStatic({ group }: { group: GroupedCharacter }) {
  return (
    <div
      className={cn(
        "relative flex-shrink-0 w-20 h-24 rounded-lg border-2 overflow-hidden shadow-2xl",
        "bg-card border-primary",
        group.hasCritical && "ring-2 ring-red-500 ring-offset-2 ring-offset-background"
      )}
    >
      <CardContent group={group} />
    </div>
  );
}

// Shared card visual content
function CardContent({ group }: { group: GroupedCharacter }) {
  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
        <span className="text-2xl font-bold text-muted-foreground/50">
          {group.characterName?.charAt(0)?.toUpperCase() || "?"}
        </span>
      </div>

      {group.count > 1 && (
        <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {group.count}×
        </div>
      )}

      {group.hasCritical && (
        <div className="absolute top-1 left-1">
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
        <p className="text-[10px] text-white font-medium truncate leading-tight">
          {group.characterName || "N/A"}
        </p>
      </div>
    </>
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
