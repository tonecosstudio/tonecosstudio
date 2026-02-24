import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, Package, Image as ImageIcon, List } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminCollections() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<any>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  // Buscar coleções
  const collectionsQuery = useQuery({
    queryKey: ["admin-collections"],
    queryFn: async () => {
      // Buscar coleções
      const { data: collections, error: collectionsError } = await supabase
        .from("collections")
        .select("*")
        .order("created_at", { ascending: false });

      if (collectionsError) throw collectionsError;
      if (!collections) return [];

      // Buscar contagem de personagens para cada coleção
      const collectionsWithCount = await Promise.all(
        collections.map(async (collection) => {
          const { count, error: countError } = await supabase
            .from("collection_characters")
            .select("*", { count: "exact", head: true })
            .eq("collection_id", collection.id);

          if (countError) {
            console.error("Error counting characters:", countError);
            return { ...collection, character_count: 0 };
          }

          return { ...collection, character_count: count || 0 };
        })
      );

      return collectionsWithCount;
    },
  });

  // Buscar personagens de uma coleção
  const charactersQuery = useQuery({
    queryKey: ["admin-characters", selectedCollection],
    enabled: Boolean(selectedCollection),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_characters")
        .select("*")
        .eq("collection_id", selectedCollection)
        .order("release_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const collections = collectionsQuery.data || [];
  const characters = charactersQuery.data || [];

  return (
    <>
      <SEOHead
        title="Admin - Coleções"
        description="Gerenciar coleções e personagens"
        noindex={true}
      />

      <AdminLayout>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Coleções</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie as coleções temáticas e seus personagens
            </p>
          </div>
          <CreateCollectionDialog
            isOpen={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ["admin-collections"] });
              setIsCreateOpen(false);
            }}
          />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Coleções</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{collections.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coleções Ativas</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {collections.filter((c: any) => c.is_active).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Personagens</CardTitle>
              <List className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {collections.reduce((acc: number, c: any) => acc + (c.character_count || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Layout em 2 colunas */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Lista de Coleções */}
          <Card>
            <CardHeader>
              <CardTitle>Coleções Disponíveis</CardTitle>
              <CardDescription>Clique em uma coleção para ver seus personagens</CardDescription>
            </CardHeader>
            <CardContent>
              {collections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma coleção cadastrada</p>
                  <Button variant="link" onClick={() => setIsCreateOpen(true)} className="mt-2">
                    Criar primeira coleção
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {collections.map((collection: any) => (
                    <CollectionCard
                      key={collection.id}
                      collection={collection}
                      isSelected={selectedCollection === collection.id}
                      onSelect={() => setSelectedCollection(collection.id)}
                      onEdit={() => setEditingCollection(collection)}
                      onSuccess={() => qc.invalidateQueries({ queryKey: ["admin-collections"] })}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personagens da Coleção Selecionada */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Personagens</CardTitle>
                  <CardDescription>
                    {selectedCollection
                      ? `${characters.length} personagens nesta coleção`
                      : "Selecione uma coleção"}
                  </CardDescription>
                </div>
                {selectedCollection && (
                  <CreateCharacterDialog
                    collectionId={selectedCollection}
                    onSuccess={() => qc.invalidateQueries({ queryKey: ["admin-characters"] })}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedCollection ? (
                <div className="text-center py-8 text-muted-foreground">
                  <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione uma coleção para ver os personagens</p>
                </div>
              ) : characters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum personagem cadastrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {characters.map((character: any) => (
                    <CharacterCard
                      key={character.id}
                      character={character}
                      onSuccess={() => qc.invalidateQueries({ queryKey: ["admin-characters"] })}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dialog de Edição */}
        {editingCollection && (
          <EditCollectionDialog
            collection={editingCollection}
            isOpen={Boolean(editingCollection)}
            onOpenChange={(open) => !open && setEditingCollection(null)}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ["admin-collections"] });
              setEditingCollection(null);
            }}
          />
        )}
      </AdminLayout>
    </>
  );
}

// Componente: Card de Coleção
function CollectionCard({ collection, isSelected, onSelect, onEdit, onSuccess }: any) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const toggleActiveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("collections")
        .update({ is_active: !collection.is_active })
        .eq("id", collection.id);

      if (error) throw error;
    },
    onSuccess: () => {
      onSuccess();
      toast({
        title: collection.is_active ? "Coleção desativada" : "Coleção ativada",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("collections").delete().eq("id", collection.id);

      if (error) throw error;
    },
    onSuccess: () => {
      onSuccess();
      toast({ title: "Coleção excluída" });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir",
        description: "Verifique se não há assinaturas ativas",
        variant: "destructive",
      });
    },
  });

  const characterCount = collection.character_count || 0;

  return (
    <div
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{collection.name}</h3>
            {collection.is_active ? (
              <Badge variant="default" className="text-xs">
                Ativa
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Inativa
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {collection.description}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{characterCount} personagens</span>
            <span>•</span>
            <span>Slug: {collection.slug}</span>
          </div>
        </div>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toggleActiveMutation.mutate()}
            disabled={toggleActiveMutation.isPending}
          >
            <Switch checked={collection.is_active} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm("Tem certeza? Esta ação não pode ser desfeita.")) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Componente: Card de Personagem
function CharacterCard({ character, onSuccess }: any) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("collection_characters")
        .delete()
        .eq("id", character.id);

      if (error) throw error;
    },
    onSuccess: () => {
      onSuccess();
      toast({ title: "Personagem excluído" });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge variant="secondary">Em breve</Badge>;
      case "revealed":
        return <Badge variant="default">Revelado</Badge>;
      case "released":
        return <Badge className="bg-green-500">Lançado</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-muted-foreground">
              #{character.release_order}
            </span>
            <h4 className="font-medium">{character.name}</h4>
            {getStatusBadge(character.status)}
          </div>
          {character.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{character.description}</p>
          )}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm("Tem certeza?")) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isEditing && (
        <EditCharacterDialog
          character={character}
          isOpen={isEditing}
          onOpenChange={setIsEditing}
          onSuccess={() => {
            onSuccess();
            setIsEditing(false);
          }}
        />
      )}
    </div>
  );
}

// Dialog: Criar Coleção
function CreateCollectionDialog({ isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("collections").insert({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        description,
        is_active: isActive,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Coleção criada com sucesso!" });
      setName("");
      setSlug("");
      setDescription("");
      setIsActive(true);
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar coleção",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Coleção
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Nova Coleção</DialogTitle>
          <DialogDescription>Crie uma coleção temática com 6 ou 12 personagens</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Nome da Coleção *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: X-Men, Terror, DC Comics..."
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="x-men (gerado automaticamente se vazio)"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Usado na URL: /colecoes/{slug || name.toLowerCase().replace(/\s+/g, "-")}
            </p>
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a coleção..."
              className="mt-2 min-h-[100px]"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label>Coleção Ativa</Label>
              <p className="text-sm text-muted-foreground">Disponível para assinatura</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "Criando..." : "Criar Coleção"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dialog: Editar Coleção
function EditCollectionDialog({ collection, isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const [name, setName] = useState(collection.name);
  const [slug, setSlug] = useState(collection.slug);
  const [description, setDescription] = useState(collection.description || "");

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("collections")
        .update({ name, slug, description })
        .eq("id", collection.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Coleção atualizada!" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Coleção</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="edit-name">Nome</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="edit-slug">Slug</Label>
            <Input
              id="edit-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="edit-description">Descrição</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!name.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dialog: Criar Personagem
function CreateCharacterDialog({ collectionId, onSuccess }: any) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [releaseOrder, setReleaseOrder] = useState("");
  const [status, setStatus] = useState("upcoming");

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("collection_characters").insert({
        collection_id: collectionId,
        name,
        description,
        release_order: parseInt(releaseOrder),
        status,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Personagem adicionado!" });
      setName("");
      setDescription("");
      setReleaseOrder("");
      setStatus("upcoming");
      setIsOpen(false);
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Personagem</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="char-name">Nome *</Label>
            <Input
              id="char-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Wolverine"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="char-order">Ordem de Lançamento *</Label>
            <Input
              id="char-order"
              type="number"
              value={releaseOrder}
              onChange={(e) => setReleaseOrder(e.target.value)}
              placeholder="1, 2, 3..."
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="char-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Em breve</SelectItem>
                <SelectItem value="revealed">Revelado</SelectItem>
                <SelectItem value="released">Lançado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="char-desc">Descrição</Label>
            <Textarea
              id="char-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do personagem..."
              className="mt-2"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || !releaseOrder || createMutation.isPending}
          >
            {createMutation.isPending ? "Adicionando..." : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dialog: Editar Personagem
function EditCharacterDialog({ character, isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const [name, setName] = useState(character.name);
  const [description, setDescription] = useState(character.description || "");
  const [releaseOrder, setReleaseOrder] = useState(String(character.release_order));
  const [status, setStatus] = useState(character.status);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("collection_characters")
        .update({
          name,
          description,
          release_order: parseInt(releaseOrder),
          status,
        })
        .eq("id", character.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Personagem atualizado!" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Personagem</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2" />
          </div>

          <div>
            <Label>Ordem</Label>
            <Input
              type="number"
              value={releaseOrder}
              onChange={(e) => setReleaseOrder(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Em breve</SelectItem>
                <SelectItem value="revealed">Revelado</SelectItem>
                <SelectItem value="released">Lançado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!name.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
