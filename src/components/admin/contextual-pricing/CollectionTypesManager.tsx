/**
 * Componente para gerenciar tipos de coleção dinamicamente
 * 
 * Permite admin criar, editar, ativar/desativar e ordenar tipos de coleção
 * sem necessidade de alterar código.
 * 
 * Spec: contextual-pricing-system
 * Task: 6.1 (RN002 - Dynamic Collection Types)
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Loader2, Plus, Edit, Info, ArrowUp, ArrowDown } from "lucide-react";
import {
  useCollectionTypes,
  useCreateCollectionType,
  useUpdateCollectionType,
  useToggleCollectionType,
  getNextSortOrder,
} from "@/hooks/useCollectionTypes";
import { useToast } from "@/hooks/use-toast";
import type { CollectionType } from "@/types/contextual-pricing";

interface CollectionTypeFormData {
  name: string;
  display_name: string;
  description: string;
  sort_order: number;
}

export function CollectionTypesManager() {
  const { data: types, isLoading } = useCollectionTypes(true); // Include inactive
  const createMutation = useCreateCollectionType();
  const updateMutation = useUpdateCollectionType();
  const toggleMutation = useToggleCollectionType();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<CollectionType | null>(null);

  const [formData, setFormData] = useState<CollectionTypeFormData>({
    name: "",
    display_name: "",
    description: "",
    sort_order: 0,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      display_name: "",
      description: "",
      sort_order: 0,
    });
  };

  const handleOpenCreateDialog = async () => {
    const nextOrder = await getNextSortOrder();
    setFormData({
      name: "",
      display_name: "",
      description: "",
      sort_order: nextOrder,
    });
    setIsCreateDialogOpen(true);
  };

  const handleOpenEditDialog = (type: CollectionType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      display_name: type.display_name,
      description: type.description || "",
      sort_order: type.sort_order,
    });
    setIsEditDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.display_name) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome técnico e nome de exibição são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    await createMutation.mutateAsync({
      name: formData.name,
      display_name: formData.display_name,
      description: formData.description || undefined,
      sort_order: formData.sort_order,
    });

    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingType || !formData.name || !formData.display_name) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome técnico e nome de exibição são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    await updateMutation.mutateAsync({
      id: editingType.id,
      name: formData.name,
      display_name: formData.display_name,
      description: formData.description || undefined,
      sort_order: formData.sort_order,
    });

    setIsEditDialogOpen(false);
    setEditingType(null);
    resetForm();
  };

  const handleToggleActive = async (typeId: string, currentStatus: boolean) => {
    await toggleMutation.mutateAsync({
      id: typeId,
      is_active: !currentStatus,
    });
  };

  const handleMoveSortOrder = async (type: CollectionType, direction: "up" | "down") => {
    const newOrder = direction === "up" ? type.sort_order - 1 : type.sort_order + 1;
    await updateMutation.mutateAsync({
      id: type.id,
      sort_order: newOrder,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Tipos de coleção permitem categorizar coleções dinamicamente. Novos tipos podem ser criados
          sem necessidade de alterar código. Cada tipo pode ter seu próprio preço base configurado.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Tipos de Coleção</CardTitle>
              <CardDescription>
                Gerencie tipos de coleção disponíveis no sistema
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Tipo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Tipo de Coleção</DialogTitle>
                  <DialogDescription>
                    Defina um novo tipo de coleção que poderá ser usado no sistema
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Técnico *</Label>
                    <Input
                      id="name"
                      placeholder="ex: rare_catalog"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Identificador único em snake_case (usado no código)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display_name">Nome de Exibição *</Label>
                    <Input
                      id="display_name"
                      placeholder="ex: Catálogo Raro"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Nome amigável exibido na interface
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      placeholder="Descrição opcional do tipo"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sort_order">Ordem de Exibição</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Menor valor aparece primeiro
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Criar Tipo"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Nome Técnico</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types?.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">
                    {type.display_name}
                    {type.description && (
                      <div className="text-sm text-muted-foreground">
                        {type.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {type.name}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{type.sort_order}</span>
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => handleMoveSortOrder(type, "up")}
                          disabled={updateMutation.isPending}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => handleMoveSortOrder(type, "down")}
                          disabled={updateMutation.isPending}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={type.is_active ?? false}
                        onCheckedChange={() => handleToggleActive(type.id, type.is_active ?? false)}
                        disabled={toggleMutation.isPending}
                      />
                      <Badge variant={type.is_active ? "default" : "secondary"}>
                        {type.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditDialog(type)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tipo de Coleção</DialogTitle>
            <DialogDescription>
              Atualize as informações do tipo de coleção
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Nome Técnico *</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_display_name">Nome de Exibição *</Label>
              <Input
                id="edit_display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Descrição</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_sort_order">Ordem de Exibição</Label>
              <Input
                id="edit_sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
