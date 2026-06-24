import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { log } from "@/lib/logger";
import { useQuickRepliesManager } from "@/hooks/admin/useQuickRepliesManager";
import type { QuickReply } from "@/hooks/admin/useQuickRepliesManager";

const CATEGORIES = [
  { value: "saudacao", label: "Saudacao" },
  { value: "pedido", label: "Pedido" },
  { value: "pagamento", label: "Pagamento" },
  { value: "rastreamento", label: "Rastreamento" },
  { value: "orcamento", label: "Orcamento" },
  { value: "duvida", label: "Duvida" },
  { value: "tecnico", label: "Tecnico" },
  { value: "despedida", label: "Despedida" },
  { value: "outro", label: "Outro" },
];

type QuickReplyFormData = {
  category: string;
  title: string;
  message: string;
  shortcut: string;
};

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
        <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
      </TableCell>
      <TableCell>
        <Badge variant="outline">
          {CATEGORIES.find((category) => category.value === reply.category)?.label || reply.category}
        </Badge>
      </TableCell>
      <TableCell className="font-medium">{reply.title}</TableCell>
      <TableCell className="max-w-md truncate">{reply.message}</TableCell>
      <TableCell>
        {reply.shortcut ? (
          <Badge variant="secondary">{reply.shortcut}</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">Sem atalho</span>
        )}
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" onClick={() => onToggleActive(reply)}>
          <Badge variant={reply.is_active ? "default" : "secondary"}>
            {reply.is_active ? "Ativa" : "Inativa"}
          </Badge>
        </Button>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(reply)} aria-label={`Editar ${reply.title}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(reply.id)} aria-label={`Excluir ${reply.title}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function getEmptyFormData(): QuickReplyFormData {
  return {
    category: "",
    title: "",
    message: "",
    shortcut: "",
  };
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
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [formData, setFormData] = useState<QuickReplyFormData>(getEmptyFormData());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCreate = () => {
    setEditingReply(null);
    setFormData(getEmptyFormData());
    setIsDialogOpen(true);
  };

  const handleEdit = (reply: QuickReply) => {
    setEditingReply(reply);
    setFormData({
      category: reply.category,
      title: reply.title,
      message: reply.message,
      shortcut: reply.shortcut ?? "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.category || !formData.title.trim() || !formData.message.trim()) {
      toast.error("Preencha os campos obrigatorios.");
      return;
    }

    try {
      await saveReply(editingReply?.id || null, {
        category: formData.category,
        title: formData.title.trim(),
        message: formData.message.trim(),
        shortcut: formData.shortcut.trim() || null,
      });

      toast.success(
        editingReply ? "Resposta rapida atualizada com sucesso." : "Resposta rapida criada com sucesso."
      );
      setIsDialogOpen(false);
      await reload();
    } catch (error) {
      log.error("Erro ao salvar resposta rapida", { error, replyId: editingReply?.id });
      toast.error("Erro ao salvar resposta rapida.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza de que deseja excluir esta resposta rapida?")) {
      return;
    }

    try {
      await removeReply(id);
      toast.success("Resposta rapida excluida com sucesso.");
      await reload();
    } catch (error) {
      log.error("Erro ao excluir resposta rapida", { error, replyId: id });
      toast.error("Erro ao excluir resposta rapida.");
    }
  };

  const handleToggleActive = async (reply: QuickReply) => {
    try {
      await toggleReplyActive(reply);
      toast.success(reply.is_active ? "Resposta desativada." : "Resposta ativada.");
      await reload();
    } catch (error) {
      log.error("Erro ao alterar status da resposta rapida", { error, replyId: reply.id });
      toast.error("Erro ao alterar status.");
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
      toast.success("Ordem atualizada com sucesso.");
    } catch (error) {
      log.error("Erro ao reordenar respostas rapidas", { error, count: updates.length });
      toast.error("Erro ao reordenar respostas.");
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Respostas rapidas</CardTitle>
              <CardDescription>
                Centralize textos padrao do atendimento em uma unica base administrativa.
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nova resposta
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-4">
            <Label>Filtrar por categoria</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[220px]">
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

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={filteredReplies.map((reply) => reply.id)}
              strategy={verticalListSortingStrategy}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]" />
                    <TableHead>Categoria</TableHead>
                    <TableHead>Titulo</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Atalho</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
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
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma resposta rapida encontrada.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingReply ? "Editar resposta rapida" : "Nova resposta rapida"}</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para {editingReply ? "atualizar" : "criar"} uma resposta
              reutilizavel do atendimento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData((current) => ({ ...current, category: value }))}
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

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <Label htmlFor="title">Titulo *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Ex: Boas-vindas"
                />
              </div>

              <div>
                <Label htmlFor="shortcut">Atalho</Label>
                <Input
                  id="shortcut"
                  value={formData.shortcut}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, shortcut: event.target.value }))
                  }
                  placeholder="Ex: Ctrl+1"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Opcional. Use o mesmo formato exibido no atendimento.
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="message">Mensagem *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, message: event.target.value }))
                }
                placeholder="Digite a mensagem que sera inserida no chat."
                rows={6}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {formData.message.length} caracteres
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
