import { useState } from "react";
import { FileText, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useGroupMessageTemplates,
  type GroupMessageTemplate,
} from "@/hooks/groups/useGroupMessageTemplates";

interface MessageTemplatesProps {
  onSelect: (text: string) => void;
}

export function MessageTemplates({ onSelect }: MessageTemplatesProps) {
  const { templates, isLoading, saveTemplate, deleteTemplate } = useGroupMessageTemplates();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<GroupMessageTemplate | null>(null);
  const [formData, setFormData] = useState({ name: "", content: "" });

  const resetForm = () => {
    setEditingTemplate(null);
    setFormData({ name: "", content: "" });
  };

  const handleSelect = (content: string) => {
    onSelect(content);
    setOpen(false);
    toast.success("Template aplicado");
  };

  const handleCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (template: GroupMessageTemplate) => {
    setEditingTemplate(template);
    setFormData({ name: template.name, content: template.content });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const name = formData.name.trim();
    const content = formData.content.trim();

    if (!name || !content) {
      toast.error("Preencha todos os campos");
      return;
    }

    saveTemplate.mutate(
      {
        name,
        content,
        id: editingTemplate?.id,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja deletar este template?")) {
      deleteTemplate.mutate(id);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 border-b flex items-center justify-between">
            <h4 className="font-semibold text-sm">Templates de Mensagens</h4>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-16 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : templates.length > 0 ? (
              <div className="p-2 space-y-1">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="group relative p-3 hover:bg-accent rounded-lg transition-colors"
                  >
                    <button
                      onClick={() => handleSelect(template.content)}
                      className="w-full text-left"
                    >
                      <p className="font-medium text-sm mb-1">{template.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.content}
                      </p>
                    </button>

                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEdit(template);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(template.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum template criado</p>
                <Button variant="link" size="sm" onClick={handleCreate} className="mt-2">
                  Criar primeiro template
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template"}</DialogTitle>
            <DialogDescription>
              Crie templates para mensagens que você envia frequentemente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Template</Label>
              <Input
                id="name"
                placeholder="Ex: Boas-vindas"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea
                id="content"
                placeholder="Digite a mensagem do template..."
                value={formData.content}
                onChange={(event) => setFormData({ ...formData, content: event.target.value })}
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Você pode usar variáveis como {"{nome}"}, {"{email}"}, etc.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saveTemplate.isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveTemplate.isPending}>
              {saveTemplate.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
