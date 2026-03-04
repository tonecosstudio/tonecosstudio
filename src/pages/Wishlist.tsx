// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Heart, Trash2, ShoppingCart, Edit2, X, Check, Bell, BellOff } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";

export default function Wishlist() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editingItem, setEditingItem] = useState<{
    id: string;
    notes: string;
    priority: number;
    notify: boolean;
  } | null>(null);

  const wishlistQuery = useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist")
        .select(
          `
          id,
          notes,
          priority,
          notify_when_available,
          added_at,
          models (
            id,
            name,
            image_path,
            image_bucket,
            franchise,
            category
          )
        `
        )
        .eq("user_id", user!.id)
        .order("priority", { ascending: false })
        .order("added_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wishlist").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      toast({ title: "Removido da lista de desejos" });
    },
    onError: () => {
      toast({ title: "Erro ao remover", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      notes,
      priority,
      notify,
    }: {
      id: string;
      notes: string;
      priority: number;
      notify: boolean;
    }) => {
      const { error } = await supabase
        .from("wishlist")
        .update({
          notes,
          priority,
          notify_when_available: notify,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      toast({ title: "Atualizado" });
      setEditingItem(null);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    },
  });

  const items = wishlistQuery.data || [];

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 2:
        return { label: "Urgente", variant: "destructive" as const };
      case 1:
        return { label: "Alta", variant: "default" as const };
      default:
        return { label: "Normal", variant: "secondary" as const };
    }
  };

  return (
    <>
      <SEOHead
        title="Lista de Desejos"
        description="Gerencie sua lista de desejos de colecionáveis"
        keywords={["wishlist", "lista de desejos", "favoritos"]}
      />

      <div className="container py-8 sm:py-12 max-w-7xl">
        <header className="mb-8">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">Lista de Desejos</h1>
          <p className="text-xs text-muted-foreground">Organize os modelos que você deseja adquirir</p>
        </header>

        {items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Heart className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-base font-semibold mb-2">Sua lista está vazia</h3>
              <p className="text-xs text-muted-foreground text-center mb-6">
                Adicione modelos à sua lista de desejos enquanto navega pelo catálogo
              </p>
              <Button asChild>
                <Link to="/catalog">Explorar Catálogo</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {items.map((item: any) => {
              const model = item.models;
              const imageUrl = model
                ? `${supabase.supabaseUrl}/storage/v1/object/public/${model.image_bucket}/${model.image_path}`
                : null;
              const priorityInfo = getPriorityLabel(item.priority);
              const isEditing = editingItem?.id === item.id;

              return (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-6">
                      {/* Imagem */}
                      <div className="w-full sm:w-48 h-48 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={model?.name || "Modelo"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            Sem imagem
                          </div>
                        )}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-semibold mb-1 line-clamp-2">
                              {model?.name || "Modelo sem nome"}
                            </h3>
                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                              {model?.franchise && <span>{model.franchise}</span>}
                              {model?.category && <span>• {model.category}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>
                            {item.notify_when_available && (
                              <Badge variant="outline" className="gap-1">
                                <Bell className="h-3 w-3" />
                                Notificar
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Notas */}
                        {isEditing ? (
                          <div className="space-y-4">
                            <div>
                              <Textarea
                                value={editingItem.notes}
                                onChange={(e) =>
                                  setEditingItem({ ...editingItem, notes: e.target.value })
                                }
                                placeholder="Adicione notas sobre este item..."
                                className="min-h-[80px]"
                                maxLength={500}
                              />
                            </div>
                            <div className="flex flex-wrap gap-4">
                              <Select
                                value={String(editingItem.priority)}
                                onValueChange={(value) =>
                                  setEditingItem({ ...editingItem, priority: Number(value) })
                                }
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">Normal</SelectItem>
                                  <SelectItem value="1">Alta</SelectItem>
                                  <SelectItem value="2">Urgente</SelectItem>
                                </SelectContent>
                              </Select>

                              <Button
                                variant={editingItem.notify ? "default" : "outline"}
                                size="sm"
                                onClick={() =>
                                  setEditingItem({ ...editingItem, notify: !editingItem.notify })
                                }
                                className="gap-2"
                              >
                                {editingItem.notify ? (
                                  <Bell className="h-4 w-4" />
                                ) : (
                                  <BellOff className="h-4 w-4" />
                                )}
                                {editingItem.notify ? "Notificar" : "Não notificar"}
                              </Button>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateMutation.mutate({
                                    id: item.id,
                                    notes: editingItem.notes,
                                    priority: editingItem.priority,
                                    notify: editingItem.notify,
                                  })
                                }
                                disabled={updateMutation.isPending}
                                className="gap-2"
                              >
                                <Check className="h-4 w-4" />
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingItem(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {item.notes && (
                              <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                                {item.notes}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditingItem({
                                    id: item.id,
                                    notes: item.notes || "",
                                    priority: item.priority,
                                    notify: item.notify_when_available,
                                  })
                                }
                                className="gap-2"
                              >
                                <Edit2 className="h-4 w-4" />
                                Editar
                              </Button>
                              <Button size="sm" variant="outline" asChild>
                                <Link to={`/catalog/${model?.id}`} className="gap-2">
                                  <ShoppingCart className="h-4 w-4" />
                                  Ver Detalhes
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeMutation.mutate(item.id)}
                                disabled={removeMutation.isPending}
                                className="gap-2 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remover
                              </Button>
                            </div>
                          </>
                        )}

                        <p className="text-xs text-muted-foreground mt-4">
                          Adicionado em {new Date(item.added_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
