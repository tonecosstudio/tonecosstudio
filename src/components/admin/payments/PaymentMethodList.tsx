/**
 * PaymentMethodList Component
 *
 * Displays all payment methods with active/inactive indicators, toggle buttons,
 * set as default button, edit and delete actions, and drag-and-drop for display_order.
 *
 * Requirements: 1.1-1.10
 * Task: 11.2 Criar componente PaymentMethodList
 */

import { useState } from "react";
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PaymentMethod } from "@/types/manual-payment";
import { useAdminPaymentMethods } from "@/hooks/admin/useAdminPaymentMethods";

interface PaymentMethodListProps {
  onEdit?: (method: PaymentMethod) => void;
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
          aria-label={`Reordenar ${method.name}`}
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
            checked={method.is_active ?? false}
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
          <span className="text-sm">{method.is_default ? "Padrao" : "Nao padrao"}</span>
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
              aria-label={`Definir ${method.name} como padrao`}
              title="Definir como padrao"
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Abrir acoes de ${method.name}`}>
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

export function PaymentMethodList({ onEdit }: PaymentMethodListProps) {
  const {
    methods,
    setMethods,
    isLoading,
    error,
    toggleActiveMutation,
    setDefaultMutation,
    updateOrderMutation,
    deleteMutation,
  } = useAdminPaymentMethods();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setMethods((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      updateOrderMutation.mutate(newItems);
      return newItems;
    });
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, isActive });
  };

  const handleSetDefault = (id: string) => {
    setDefaultMutation.mutate(id);
  };

  const handleEdit = (method: PaymentMethod) => {
    onEdit?.(method);
  };

  const handleDelete = (method: PaymentMethod) => {
    setMethodToDelete(method);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (deleteMutation.isPending) {
      return;
    }

    setDeleteDialogOpen(open);
    if (!open) {
      setMethodToDelete(null);
    }
  };

  const confirmDelete = () => {
    if (!methodToDelete) {
      return;
    }

    deleteMutation.mutate(methodToDelete.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setMethodToDelete(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
          <p className="mt-2 text-sm text-gray-600">Carregando metodos de pagamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erro ao carregar metodos de pagamento</h3>
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
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-500">Nenhum metodo de pagamento configurado.</p>
        <p className="mt-1 text-sm text-gray-400">
          Clique em "Adicionar Metodo" para criar seu primeiro metodo de pagamento.
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
                <TableHead>Padrao</TableHead>
                <TableHead className="text-right">Ordem</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext items={methods.map((method) => method.id)} strategy={verticalListSortingStrategy}>
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
          <strong>Dica:</strong> Arraste os itens pelo icone <GripVertical className="inline h-3 w-3" /> para
          reordenar. A ordem afeta como os metodos sao exibidos para os clientes.
        </p>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir metodo de pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o metodo de pagamento "{methodToDelete?.name}"? Esta acao nao pode ser
              desfeita. Metodos de pagamento excluidos nao poderao ser usados em novos pagamentos, mas pagamentos
              existentes continuarao referenciando este metodo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
