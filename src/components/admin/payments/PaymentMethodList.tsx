/**
 * PaymentMethodList Component
 *
 * Displays all payment methods with active/inactive indicators, toggle buttons,
 * set as default button, edit and delete actions, and drag-and-drop for display_order.
 *
 * Requirements: 1.1-1.10
 * Task: 11.2 Criar componente PaymentMethodList
 */

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  MoreVertical,
  Edit,
  Trash2,
  Star,
  StarOff,
  GripVertical,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PaymentMethod } from "@/types/manual-payment";
import {
  listAllPaymentMethods,
  togglePaymentMethodActive,
  setDefaultPaymentMethod,
  updatePaymentMethod,
  clearPaymentMethodCache,
} from "@/lib/payment-method-service";

interface PaymentMethodListProps {
  onEdit?: (method: PaymentMethod) => void;
  onDelete?: (method: PaymentMethod) => void;
}

interface SortableRowProps {
  method: PaymentMethod;
  onToggleActive: (id: string, isActive: boolean) => void;
  onSetDefault: (id: string) => void;
  onEdit: (method: PaymentMethod) => void;
  onDelete: (method: PaymentMethod) => void;
}

function SortableRow({ method, onToggleActive, onSetDefault, onEdit, onDelete }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: method.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      </TableCell>
      <TableCell className="font-medium">{method.name}</TableCell>
      <TableCell>
        <Badge variant="outline" className="capitalize">
          {method.type}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch
            checked={method.is_active}
            onCheckedChange={(checked) => onToggleActive(method.id, checked)}
            aria-label={`Toggle ${method.name} active status`}
          />
          {method.is_active ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-sm">{method.is_active ? "Ativo" : "Inativo"}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {method.is_default ? (
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          ) : (
            <StarOff className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-sm">{method.is_default ? "Padrão" : "Não padrão"}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">{method.display_order}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {!method.is_default && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSetDefault(method.id)}
              title="Definir como padrão"
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(method)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(method)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function PaymentMethodList({ onEdit, onDelete }: PaymentMethodListProps) {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  // Fetch payment methods
  const {
    data: paymentMethods = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["payment-methods", "all"],
    queryFn: listAllPaymentMethods,
  });

  // Initialize methods when data loads
  React.useEffect(() => {
    if (paymentMethods.length > 0) {
      setMethods(paymentMethods);
    }
  }, [paymentMethods]);

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      togglePaymentMethodActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      clearPaymentMethodCache();
      toast({
        title: "Status atualizado",
        description: "Status do método de pagamento foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Set default payment method mutation
  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => setDefaultPaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      clearPaymentMethodCache();
      toast({
        title: "Método padrão definido",
        description: "Método de pagamento definido como padrão com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao definir método padrão: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update display order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (updatedMethods: PaymentMethod[]) => {
      // Update each method's display_order
      const updates = updatedMethods.map((method, index) =>
        updatePaymentMethod(method.id, { display_order: index })
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      clearPaymentMethodCache();
      toast({
        title: "Ordem atualizada",
        description: "Ordem de exibição dos métodos de pagamento foi atualizada.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar ordem: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Configure drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMethods((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Update display_order in database
        updateOrderMutation.mutate(newItems);

        return newItems;
      });
    }
  };

  // Handle toggle active
  const handleToggleActive = (id: string, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, isActive });
  };

  // Handle set default
  const handleSetDefault = (id: string) => {
    setDefaultMutation.mutate(id);
  };

  // Handle edit
  const handleEdit = (method: PaymentMethod) => {
    if (onEdit) {
      onEdit(method);
    }
  };

  // Handle delete
  const handleDelete = (method: PaymentMethod) => {
    setMethodToDelete(method);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (methodToDelete && onDelete) {
      onDelete(methodToDelete);
    }
    setDeleteDialogOpen(false);
    setMethodToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Carregando métodos de pagamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Erro ao carregar métodos de pagamento
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
        <p className="text-gray-500">Nenhum método de pagamento configurado.</p>
        <p className="text-sm text-gray-400 mt-1">
          Clique em "Adicionar Método" para criar seu primeiro método de pagamento.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Ordem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Padrão</TableHead>
                <TableHead className="text-right">Ordem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext
                items={methods.map((m) => m.id)}
                strategy={verticalListSortingStrategy}
              >
                {methods.map((method) => (
                  <SortableRow
                    key={method.id}
                    method={method}
                    onToggleActive={handleToggleActive}
                    onSetDefault={handleSetDefault}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>
          <strong>Dica:</strong> Arraste os itens pelo ícone{" "}
          <GripVertical className="inline h-3 w-3" /> para reordenar. A ordem afeta como os métodos
          são exibidos para os clientes.
        </p>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir método de pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o método de pagamento "{methodToDelete?.name}"? Esta
              ação não pode ser desfeita. Métodos de pagamento excluídos não poderão ser usados em
              novos pagamentos, mas pagamentos existentes continuarão referenciando este método.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
