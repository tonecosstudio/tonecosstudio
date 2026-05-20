import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getPublicCollection,
  addToPublicCollection,
  removeFromPublicCollection,
  updateCollectionNotes,
  searchAvailablePublicCollectionModels,
  getPublicModelImageUrl,
} from "@/lib/collector";
import { Plus, Trash2, Edit2, X } from "lucide-react";

type Props = {
  userId: string;
};

export function ManagePublicCollection({ userId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<{ id: string; notes: string } | null>(null);

  const collectionQuery = useQuery({
    queryKey: ["my-public-collection", userId],
    queryFn: () => getPublicCollection(userId),
  });

  const modelsQuery = useQuery({
    queryKey: ["available-models", searchQuery],
    enabled: isAddDialogOpen && searchQuery.length >= 2,
    queryFn: () => searchAvailablePublicCollectionModels(searchQuery),
  });

  const addMutation = useMutation({
    mutationFn: (modelId: string) => addToPublicCollection(userId, modelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-public-collection"] });
      toast({ title: "Adicionado à coleção pública" });
      setIsAddDialogOpen(false);
      setSearchQuery("");
    },
    onError: (error: Error) => {
      const msg = error.message || "Erro ao adicionar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (collectionId: string) => removeFromPublicCollection(collectionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-public-collection"] });
      toast({ title: "Removido da coleção pública" });
    },
    onError: () => {
      toast({ title: "Erro ao remover", variant: "destructive" });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => updateCollectionNotes(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-public-collection"] });
      toast({ title: "Notas atualizadas" });
      setEditingItem(null);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar notas", variant: "destructive" });
    },
  });

  const collection = collectionQuery.data || [];
  const availableModels = modelsQuery.data || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Minha Coleção Pública</CardTitle>
            <CardDescription>
              Escolha quais peças você quer mostrar no seu perfil público
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar à Coleção Pública</DialogTitle>
                <DialogDescription>Busque e adicione modelos que você possui</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="search">Buscar modelo</Label>
                  <Input
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Digite o nome do modelo..."
                    className="mt-2"
                  />
                </div>
                {modelsQuery.isLoading && (
                  <p className="text-sm text-muted-foreground">Buscando...</p>
                )}
                {availableModels.length > 0 && (
                  <div className="grid gap-3 max-h-96 overflow-y-auto">
                    {availableModels.map((model) => {
                      const isInCollection = collection.some(
                        (item) => item.model_id === model.id
                      );
                      const imageUrl = getPublicModelImageUrl(model);
                      return (
                        <div
                          key={model.id}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="h-16 w-16 rounded bg-muted flex-shrink-0">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={model.name}
                                className="h-full w-full object-cover rounded"
                              />
                            ) : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-1">{model.name}</p>
                            {model.franchise && (
                              <p className="text-xs text-muted-foreground">{model.franchise}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addMutation.mutate(model.id)}
                            disabled={isInCollection || addMutation.isPending}
                          >
                            {isInCollection ? "Já adicionado" : "Adicionar"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {collection.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Sua coleção pública está vazia</p>
            <p className="text-sm mt-1">Adicione modelos para mostrar no seu perfil</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collection.map((item) => {
              const imageUrl = item.models
                ? getPublicModelImageUrl(item.models)
                : null;
              return (
                <div key={item.id} className="border rounded-lg overflow-hidden">
                  <div className="aspect-square bg-muted relative">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.models?.name || "Modelo"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                        Sem imagem
                      </div>
                    )}
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => removeMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-3 space-y-2">
                    <div>
                      <p className="font-medium text-sm line-clamp-2">
                        {item.models?.name || "Sem nome"}
                      </p>
                      {item.models?.franchise && (
                        <p className="text-xs text-muted-foreground">{item.models.franchise}</p>
                      )}
                    </div>
                    {editingItem?.id === item.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingItem.notes}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, notes: e.target.value })
                          }
                          placeholder="Adicione uma nota..."
                          className="text-xs min-h-[60px]"
                          maxLength={200}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() =>
                              updateNotesMutation.mutate({ id: item.id, notes: editingItem.notes })
                            }
                          >
                            Salvar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        {item.notes ? (
                          <p className="text-xs text-muted-foreground italic flex-1 line-clamp-2">
                            {item.notes}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground flex-1">Sem notas</p>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => setEditingItem({ id: item.id, notes: item.notes || "" })}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
