import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, GripVertical, Save, X } from "lucide-react";
import { toast } from "sonner";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuickRepliesManager } from "@/hooks/admin/useQuickRepliesManager";
import type { QuickReply } from "@/hooks/admin/useQuickRepliesManager";

const CATEGORIES = [
  { value: "saudacao", label: "SaudaÃ§Ã£o" },
  { value: "pedido", label: "Pedido" },
  { value: "pagamento", label: "Pagamento" },
  { value: "rastreamento", label: "Rastreamento" },
  { value: "orcamento", label: "OrÃ§amento" },
  { value: "duvida", label: "DÃºvida" },
  { value: "despedida", label: "Despedida" },
  { value: "outro", label: "Outro" },
];

interface SortableRowProps {
  reply: QuickReply;
  onEdit: (reply: QuickReply) => void;
  onDelete: (id: string) => void;
  onToggleActive: (reply: QuickReply) => void;
}

function SortableRow({ reply, onEdit, onDelete, onToggleActive }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: reply.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
      </TableCell>
      <TableCell>
        <Badge variant="outline">
          {CATEGORIES.find((c) => c.value === reply.category)?.label || reply.category}
        </Badge>
      </TableCell>
      <TableCell className="font-medium">{reply.title}</TableCell>
      <TableCell className="max-w-md truncate">{reply.message}</TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" onClick={() => onToggleActive(reply)}>
          <Badge variant={reply.is_active ? "default" : "secondary"}>
            {reply.is_active ? "Ativo" : "Inativo"}
          </Badge>
        </Button>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(reply)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(reply.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function QuickRepliesManager() {
  const {
    quickReplies,
    loading,
    reload,
    saveReply,
    removeReply,
    toggleReplyActive,
    reorderReplies,
    setQuickReplies,
  } = useQuickRepliesManager();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [formData, setFormData] = useState({
    category: "",
    title: "",
    message: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCreate = () => {
    setEditingReply(null);
    setFormData({ category: "", title: "", message: "" });
    setIsDialogOpen(true);
  };

  const handleEdit = (reply: QuickReply) => {
    setEditingReply(reply);
    setFormData({
      category: reply.category,
      title: reply.title,
      message: reply.message,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.category || !formData.title || !formData.message) {
      toast.error("Preencha todos os campos obrigatÃ³rios");
      return;
    }

    try {
      await saveReply(editingReply?.id || null, formData);
      toast.success(
        editingReply
          ? "Resposta rÃ¡pida atualizada com sucesso"
          : "Resposta rÃ¡pida criada com sucesso"
      );
      setIsDialogOpen(false);
      await reload();
    } catch (error) {
      console.error("Erro ao salvar resposta rÃ¡pida:", error);
      toast.error("Erro ao salvar resposta rÃ¡pida");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta resposta rÃ¡pida?")) {
      return;
    }

    try {
      await removeReply(id);
      toast.success("Resposta rÃ¡pida deletada com sucesso");
      await reload();
    } catch (error) {
      console.error("Erro ao deletar resposta rÃ¡pida:", error);
      toast.error("Erro ao deletar resposta rÃ¡pida");
    }
  };

  const handleToggleActive = async (reply: QuickReply) => {
    try {
      await toggleReplyActive(reply);
      toast.success(reply.is_active ? "Resposta desativada" : "Resposta ativada");
      await reload();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status");
    }
  };

  const filteredReplies =
    selectedCategory === "all"
      ? quickReplies
      : quickReplies.filter((reply) => reply.category === selectedCategory);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = filteredReplies.findIndex((item) => item.id === active.id);
    const newIndex = filteredReplies.findIndex((item) => item.id === over.id);
    const newItems = arrayMove(filteredReplies, oldIndex, newIndex);
    const updates = newItems.map((item, index) => ({
      id: item.id,
      display_order: index,
    }));

    const optimisticReplies = quickReplies.map((reply) => {
      const update = updates.find((item) => item.id === reply.id);
      return update ? { ...reply, display_order: update.display_order } : reply;
    });
    setQuickReplies(optimisticReplies);

    try {
      await reorderReplies(updates);
      toast.success("Ordem atualizada com sucesso");
    } catch (error) {
      console.error("Erro ao reordenar:", error);
      toast.error("Erro ao reordenar respostas");
      await reload();
    }
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gerenciar Respostas RÃ¡pidas</CardTitle>
              <CardDescription>
                Crie, edite e organize respostas rÃ¡pidas para o chat de suporte
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Resposta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label>Filtrar por categoria</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredReplies.map((reply) => reply.id)}
              strategy={verticalListSortingStrategy}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>TÃ­tulo</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">AÃ§Ãµes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReplies.map((reply) => (
                    <SortableRow
                      key={reply.id}
                      reply={reply}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </TableBody>
              </Table>
            </SortableContext>
          </DndContext>

          {filteredReplies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma resposta rÃ¡pida encontrada
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingReply ? "Editar Resposta RÃ¡pida" : "Nova Resposta RÃ¡pida"}
            </DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para {editingReply ? "atualizar" : "criar"} uma resposta
              rÃ¡pida
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">TÃ­tulo *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                placeholder="Ex: Boas-vindas"
              />
            </div>

            <div>
              <Label htmlFor="message">Mensagem *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(event) => setFormData({ ...formData, message: event.target.value })}
                placeholder="Digite a mensagem que serÃ¡ inserida no chat"
                rows={6}
              />
              <p className="text-xs text-muted-foreground mt-1">{formData.message.length} caracteres</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
