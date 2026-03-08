/**
 * ProductionKanbanBoard Component
 * 
 * Provides a visual kanban board with columns for each production stage:
 * - Drag-and-drop support using @dnd-kit
 * - Column collapse/expand functionality
 * - Item count per column
 * - "Add to stage" button per column
 * 
 * Features:
 * - Visual organization by production stage
 * - Drag items between stages to update status
 * - Collapsible columns to save space
 * - Real-time updates
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { ChevronDown, ChevronRight, Plus, Package, MoreVertical, UserPlus, AlertCircle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  fetchProductionQueue,
  updateProductionStage,
  type ProductionQueueItem,
  type ProductionStage,
  type ProductionFilters,
  type PaginatedResponse,
} from "@/services/admin/production-service";

interface ProductionKanbanBoardProps {
  filters: ProductionFilters;
}

// Stage configuration with labels and colors
const STAGE_CONFIG: Array<{
  key: ProductionStage;
  label: string;
  color: string;
}> = [
  { key: "awaiting_choice", label: "Aguardando Escolha", color: "bg-yellow-100 border-yellow-300" },
  { key: "design", label: "Design", color: "bg-blue-100 border-blue-300" },
  { key: "production", label: "Produção", color: "bg-purple-100 border-purple-300" },
  { key: "quality_check", label: "Controle de Qualidade", color: "bg-green-100 border-green-300" },
  { key: "packaging", label: "Embalagem", color: "bg-orange-100 border-orange-300" },
  { key: "shipped", label: "Enviado", color: "bg-gray-100 border-gray-300" },
];

export function ProductionKanbanBoard({ filters }: ProductionKanbanBoardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [collapsedColumns, setCollapsedColumns] = useState<Set<ProductionStage>>(new Set());
  const [activeItem, setActiveItem] = useState<ProductionQueueItem | null>(null);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  );

  // Fetch production queue items
  const { data: queueData, isLoading } = useQuery({
    queryKey: ["production-queue", filters],
    queryFn: () => fetchProductionQueue(filters, { page: 1, pageSize: 1000 }),
  });

  // Mutation for updating stage (success/error handling done in handleDragEnd for better control)
  const updateStageMutation = useMutation({
    mutationFn: ({ itemId, newStage }: { itemId: string; newStage: ProductionStage }) =>
      updateProductionStage(itemId, newStage),
  });

  // Group items by stage
  const itemsByStage = useMemo(() => {
    const grouped = new Map<ProductionStage, ProductionQueueItem[]>();
    
    // Initialize all stages with empty arrays
    STAGE_CONFIG.forEach(stage => {
      grouped.set(stage.key, []);
    });

    // Group items by current stage
    queueData?.data.forEach(item => {
      const stageItems = grouped.get(item.currentStage) || [];
      stageItems.push(item);
      grouped.set(item.currentStage, stageItems);
    });

    return grouped;
  }, [queueData]);

  // Toggle column collapse
  const toggleColumn = (stage: ProductionStage) => {
    setCollapsedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stage)) {
        newSet.delete(stage);
      } else {
        newSet.add(stage);
      }
      return newSet;
    });
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const item = queueData?.data.find(i => i.id === event.active.id);
    setActiveItem(item || null);
  };

  // Validate stage transition
  const validateStageTransition = (currentStage: ProductionStage, newStage: ProductionStage): { valid: boolean; error?: string } => {
    // Define valid stage order
    const stageOrder: ProductionStage[] = [
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

    const currentIndex = stageOrder.indexOf(currentStage);
    const newIndex = stageOrder.indexOf(newStage);

    // Can't move to the same stage
    if (currentIndex === newIndex) {
      return { valid: false, error: "O item já está neste estágio." };
    }

    // Can't skip stages (can only move to adjacent stages or backwards)
    if (newIndex > currentIndex + 1) {
      return { 
        valid: false, 
        error: "Não é possível pular estágios. Complete o estágio atual primeiro." 
      };
    }

    // Special validation: can't move from awaiting_choice if choice is still pending
    if (currentStage === "awaiting_choice" && newIndex > currentIndex) {
      const item = queueData?.data.find(i => i.currentStage === currentStage);
      if (item?.choiceStatus === "pending") {
        return {
          valid: false,
          error: "Aguardando escolha do personagem pelo cliente. Não é possível avançar.",
        };
      }
    }

    return { valid: true };
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over || active.id === over.id) {
      return;
    }

    // Extract stage from droppable ID (format: "stage-{stageName}")
    const newStage = over.id.toString().replace("stage-", "") as ProductionStage;
    const itemId = active.id.toString();

    // Find the item being moved
    const item = queueData?.data.find(i => i.id === itemId);
    if (!item) return;

    // Don't update if dropping in the same stage
    if (item.currentStage === newStage) return;

    // Validate stage transition
    const validation = validateStageTransition(item.currentStage, newStage);
    if (!validation.valid) {
      toast({
        title: "Transição inválida",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Optimistic update: immediately update the UI
    const previousData = queryClient.getQueryData<PaginatedResponse<ProductionQueueItem>>(["production-queue", filters]);
    
    if (previousData) {
      queryClient.setQueryData<PaginatedResponse<ProductionQueueItem>>(
        ["production-queue", filters],
        {
          ...previousData,
          data: previousData.data.map(i =>
            i.id === itemId ? { ...i, currentStage: newStage } : i
          ),
        }
      );
    }

    // Update the stage with rollback on error
    updateStageMutation.mutate(
      { itemId, newStage },
      {
        onError: (error) => {
          // Rollback: restore previous data
          if (previousData) {
            queryClient.setQueryData(["production-queue", filters], previousData);
          }
          
          toast({
            title: "Erro ao atualizar estágio",
            description: error.message || "Não foi possível mover o item. Tente novamente.",
            variant: "destructive",
          });
        },
        onSuccess: () => {
          // Show success notification
          toast({
            title: "Estágio atualizado com sucesso",
            description: `O item foi movido para "${STAGE_CONFIG.find(s => s.key === newStage)?.label}".`,
          });
          
          // Invalidate queries to ensure data consistency
          queryClient.invalidateQueries({ queryKey: ["production-queue"] });
          queryClient.invalidateQueries({ queryKey: ["production-metrics"] });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="text-sm text-muted-foreground">Carregando quadro kanban...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGE_CONFIG.map(stage => {
          const items = itemsByStage.get(stage.key) || [];
          const isCollapsed = collapsedColumns.has(stage.key);
          const itemCount = items.length;

          return (
            <KanbanColumn
              key={stage.key}
              stage={stage.key}
              label={stage.label}
              color={stage.color}
              items={items}
              itemCount={itemCount}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => toggleColumn(stage.key)}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeItem ? (
          <KanbanCard item={activeItem} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Kanban Column Component
interface KanbanColumnProps {
  stage: ProductionStage;
  label: string;
  color: string;
  items: ProductionQueueItem[];
  itemCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function KanbanColumn({
  stage,
  label,
  color,
  items,
  itemCount,
  isCollapsed,
  onToggleCollapse,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage}`,
  });

  return (
    <div
      className={`flex-shrink-0 ${isCollapsed ? "w-16" : "w-80"} transition-all duration-200`}
    >
      <Card className={`border-2 ${color} shadow-sm h-full ${isOver ? "ring-2 ring-primary" : ""}`}>
        <CardHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            {isCollapsed ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleCollapse}
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <h3 className="font-semibold text-sm truncate">{label}</h3>
                </div>
                <Badge variant="secondary" className="flex-shrink-0">
                  {itemCount}
                </Badge>
              </>
            )}
          </div>

          {!isCollapsed && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => {
                // TODO: Implement add item to stage functionality
                console.log("Add item to stage:", stage);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          )}
        </CardHeader>

        {!isCollapsed && (
          <CardContent
            ref={setNodeRef}
            className="p-2 space-y-2 overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 300px)", minHeight: "200px" }}
          >
            {items.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-8">
                Nenhum item neste estágio
              </div>
            ) : (
              items.map(item => (
                <KanbanCard key={item.id} item={item} />
              ))
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Kanban Card Component
interface KanbanCardProps {
  item: ProductionQueueItem;
  isDragging?: boolean;
}

function KanbanCard({ item, isDragging = false }: KanbanCardProps) {
  const { toast } = useToast();
  const { attributes, listeners, setNodeRef, transform, isDragging: isBeingDragged } = useDraggable({
    id: item.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const priorityColors: Record<string, string> = {
    critical: "bg-red-500 text-white",
    high: "bg-orange-500 text-white",
    normal: "bg-blue-500 text-white",
    low: "bg-gray-500 text-white",
  };

  const priorityLabels: Record<string, string> = {
    critical: "Crítico",
    high: "Alto",
    normal: "Normal",
    low: "Baixo",
  };

  // Calculate deadline countdown
  const getDeadlineInfo = () => {
    if (!item.choiceDeadline) return null;
    
    const deadline = new Date(item.choiceDeadline);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMs < 0) {
      return { text: "Prazo expirado", color: "text-red-600", urgent: true };
    } else if (diffHours < 24) {
      return { text: `${diffHours}h restantes`, color: "text-red-600", urgent: true };
    } else if (diffDays < 3) {
      return { text: `${diffDays}d restantes`, color: "text-orange-600", urgent: true };
    } else {
      return { text: `${diffDays}d restantes`, color: "text-muted-foreground", urgent: false };
    }
  };

  const deadlineInfo = getDeadlineInfo();

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle quick actions
  const handleAssign = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: "Atribuir item",
      description: "Funcionalidade de atribuição será implementada em breve.",
    });
  };

  const handleBlock = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: "Bloquear item",
      description: "Funcionalidade de bloqueio será implementada em breve.",
    });
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast({
      title: "Ver detalhes",
      description: "Funcionalidade de visualização de detalhes será implementada em breve.",
    });
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        cursor-move hover:shadow-md transition-shadow
        ${isBeingDragged || isDragging ? "opacity-50" : ""}
      `}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header: Customer Name and Quick Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate" title={item.customerName}>
              {item.customerName}
            </div>
            {/* Order Number */}
            <div className="text-xs text-muted-foreground truncate" title={`Pedido: ${item.orderId.slice(0, 8)}`}>
              #{item.orderId.slice(0, 8)}
            </div>
          </div>
          
          {/* Quick Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-accent"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={handleAssign}>
                <UserPlus className="h-4 w-4 mr-2" />
                Atribuir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBlock}>
                <AlertCircle className="h-4 w-4 mr-2" />
                Bloquear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleViewDetails}>
                <Eye className="h-4 w-4 mr-2" />
                Ver detalhes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Collection Name with Icon */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Package className="h-3 w-3 flex-shrink-0" />
          <span className="truncate" title={item.collectionName}>
            {item.collectionName}
          </span>
        </div>

        {/* Character Name (if chosen) */}
        {item.characterName && (
          <div className="text-xs text-muted-foreground truncate" title={item.characterName}>
            Personagem: {item.characterName}
          </div>
        )}

        {/* Priority Badge */}
        <Badge
          className={`text-xs ${priorityColors[item.priority] || priorityColors.normal}`}
        >
          {priorityLabels[item.priority] || item.priority}
        </Badge>

        {/* Deadline Countdown (if applicable) */}
        {deadlineInfo && item.choiceStatus === "pending" && (
          <div className={`text-xs font-medium ${deadlineInfo.color} flex items-center gap-1`}>
            {deadlineInfo.urgent && <AlertCircle className="h-3 w-3" />}
            Prazo: {deadlineInfo.text}
          </div>
        )}

        {/* Assigned Team Member Avatar */}
        {item.assignedToName && (
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(item.assignedToName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate" title={item.assignedToName}>
              {item.assignedToName}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
