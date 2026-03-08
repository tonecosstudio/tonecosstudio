import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Edit, Trash2, X } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  created_by: string;
  created_at: string;
}

interface MessageTemplatesProps {
  onSelect: (text: string) => void;
}

export function MessageTemplates({ onSelect }: MessageTemplatesProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState({ name: "", content: "" });

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["message-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MessageTemplate[];
    },
    enabled: !!user,
  });

  // Create/Update template mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; content: string; id?: string }) => {
      if (data.id) {
        // Update
        const { error } = await supabase
          .from("message_templates")
          .update({ name: data.name, content: data.content })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase.from("message_templates").insert({
          name: data.name,
          content: data.content,
          created_by: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      setDialogOpen(false);
      setEditingTemplate(null);
      setFormData({ name: "", content: "" });
      toast.success(editingTemplate ? "Template atualizado" : "Template criado");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar template");
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("message_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast.success("Template deletado");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao deletar template");
    },
  });

  const handleSelect = (content: string) => {
    onSelect(content);
    setOpen(false);
    toast.success("Template aplicado");
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({ name: "", content: "" });
    setDialogOpen(true);
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({ name: template.name, content: template.content });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    saveMutation.mutate({
      ...formData,
      id: editingTemplate?.id,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja deletar este template?")) {
      deleteMutation.mutate(id);
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
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : templates && templates.length > 0 ? (
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(template);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
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

      {/* Create/Edit Dialog */}
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea
                id="content"
                placeholder="Digite a mensagem do template..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
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
              disabled={saveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
