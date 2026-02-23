// @ts-nocheck
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, Package, Image as ImageIcon, Calendar, Upload, Eye, X } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";

const COLLECTION_SIZES = [
  { value: 6, label: "6 personagens (Semestral)" },
  { value: 12, label: "12 personagens (Anual)" },
];

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function AdminCollectionsV2() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<any>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "calendar">("grid");

  // Buscar coleções
  const collectionsQuery = useQuery({
    queryKey: ["admin-collections-v2"],
    queryFn: async () => {
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
    queryKey: ["admin-characters-v2", selectedCollection],
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
  const selectedCollectionData = collections.find((c: any) => c.id === selectedCollection);

  return (
    <>
      <SEOHead
        title="Admin - Coleções Premium"
        description="Gerenciar coleções temáticas com sistema avançado"
        noindex={true}
      />

      <AdminLayout>
        {/* Header Premium */}
        <div className="mb-12">
          <div className="h-px w-20 bg-foreground mb-6" />
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-5xl font-bold tracking-tight mb-2">Coleções Premium</h1>
              <p className="text-lg text-muted-foreground">
                Sistema completo de gerenciamento de coleções temáticas
              </p>
            </div>
            <CreateCollectionDialog
              isOpen={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              onSuccess={() => {
                qc.invalidateQueries({ queryKey: ["admin-collections-v2"] });
                setIsCreateOpen(false);
              }}
            />
          </div>
        </div>

        {/* Stats Premium */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="border-border bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Coleções</CardTitle>
              <Package className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{collections.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Coleções cadastradas
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coleções Ativas</CardTitle>
              <Package className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {collections.filter((c: any) => c.is_active).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Disponíveis para assinatura
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Personagens</CardTitle>
              <ImageIcon className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {collections.reduce((acc: number, c: any) => acc + (c.character_count || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Personagens cadastrados
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-gradient-to-br from-amber-500/10 to-amber-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Imagens</CardTitle>
              <ImageIcon className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {collections.filter((c: any) => c.image_url).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Coleções com capa
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Layout Principal */}
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* Sidebar: Lista de Coleções */}
          <Card className="border-border shadow-premium h-fit sticky top-4">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Coleções ({collections.length})
              </CardTitle>
              <CardDescription>
                Selecione uma coleção para gerenciar
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {collections.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground mb-4">Nenhuma coleção cadastrada</p>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Criar Primeira Coleção
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {collections.map((collection: any) => (
                    <CollectionCardPremium
                      key={collection.id}
                      collection={collection}
                      isSelected={selectedCollection === collection.id}
                      onSelect={() => setSelectedCollection(collection.id)}
                      onEdit={() => setEditingCollection(collection)}
                      onSuccess={() => qc.invalidateQueries({ queryKey: ["admin-collections-v2"] })}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main: Personagens */}
          <div className="space-y-6">
            {!selectedCollection ? (
              <Card className="border-border shadow-premium">
                <CardContent className="pt-12 pb-12">
                  <div className="text-center">
                    <ImageIcon className="h-20 w-20 mx-auto mb-6 opacity-20" />
                    <h3 className="text-2xl font-semibold mb-2">Selecione uma Coleção</h3>
                    <p className="text-muted-foreground mb-6">
                      Escolha uma coleção na lista ao lado para gerenciar seus personagens
                    </p>
                    {collections.length === 0 && (
                      <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Criar Nova Coleção
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Header da Coleção Selecionada */}
                <Card className="border-border shadow-premium">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-6">
                      {/* Imagem da Coleção */}
                      {selectedCollectionData?.image_url ? (
                        <img
                          src={selectedCollectionData.image_url}
                          alt={selectedCollectionData.name}
                          className="w-32 h-32 object-cover rounded-lg border-2 border-border"
                        />
                      ) : (
                        <div className="w-32 h-32 bg-muted rounded-lg border-2 border-border flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-muted-foreground opacity-50" />
                        </div>
                      )}

                      {/* Info da Coleção */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h2 className="text-2xl font-bold mb-1">{selectedCollectionData?.name}</h2>
                            <p className="text-muted-foreground">{selectedCollectionData?.description}</p>
                          </div>
                          {selectedCollectionData?.is_active ? (
                            <Badge className="bg-green-500">Ativa</Badge>
                          ) : (
                            <Badge variant="secondary">Inativa</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ImageIcon className="h-4 w-4" />
                            {characters.length} personagens
                          </span>
                          <span>•</span>
                          <span>{characters.filter((c: any) => c.image_url).length} com imagem</span>
                          <span>•</span>
                          <span className="font-mono">/{selectedCollectionData?.slug}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Toolbar */}
                <Card className="border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant={viewMode === "grid" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setViewMode("grid")}
                        >
                          Grid
                        </Button>
                        <Button
                          variant={viewMode === "calendar" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setViewMode("calendar")}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Calendário
                        </Button>
                      </div>

                      <CreateCharacterDialog
                        collectionId={selectedCollection}
                        maxOrder={characters.length}
                        onSuccess={() => {
                          qc.invalidateQueries({ queryKey: ["admin-characters-v2"] });
                          qc.invalidateQueries({ queryKey: ["admin-collections-v2"] });
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Personagens */}
                {characters.length === 0 ? (
                  <Card className="border-border shadow-premium">
                    <CardContent className="pt-12 pb-12">
                      <div className="text-center">
                        <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                        <h3 className="text-xl font-semibold mb-2">Nenhum Personagem</h3>
                        <p className="text-muted-foreground mb-6">
                          Adicione personagens para começar a montar esta coleção
                        </p>
                        <CreateCharacterDialog
                          collectionId={selectedCollection}
                          maxOrder={0}
                          onSuccess={() => {
                            qc.invalidateQueries({ queryKey: ["admin-characters-v2"] });
                            qc.invalidateQueries({ queryKey: ["admin-collections-v2"] });
                          }}
                          trigger={
                            <Button className="gap-2">
                              <Plus className="h-4 w-4" />
                              Adicionar Primeiro Personagem
                            </Button>
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                ) : viewMode === "grid" ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {characters.map((character: any) => (
                      <CharacterCardPremium
                        key={character.id}
                        character={character}
                        onSuccess={() => {
                          qc.invalidateQueries({ queryKey: ["admin-characters-v2"] });
                          qc.invalidateQueries({ queryKey: ["admin-collections-v2"] });
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <CalendarView characters={characters} />
                )}
              </>
            )}
          </div>
        </div>

        {/* Dialog de Edição */}
        {editingCollection && (
          <EditCollectionDialog
            collection={editingCollection}
            isOpen={Boolean(editingCollection)}
            onOpenChange={(open) => !open && setEditingCollection(null)}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ["admin-collections-v2"] });
              setEditingCollection(null);
            }}
          />
        )}
      </AdminLayout>
    </>
  );
}

// Componente: Card de Coleção Premium
function CollectionCardPremium({ collection, isSelected, onSelect, onEdit, onSuccess }: any) {
  const { toast } = useToast();

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
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("collections")
        .delete()
        .eq("id", collection.id);

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

  return (
    <div
      className={cn(
        "group relative p-4 rounded-lg border cursor-pointer transition-all",
        isSelected 
          ? "border-primary bg-primary/10 shadow-md" 
          : "hover:bg-muted/50 hover:border-primary/50"
      )}
      onClick={onSelect}
    >
      {/* Imagem */}
      {collection.image_url && (
        <div className="mb-3">
          <img
            src={collection.image_url}
            alt={collection.name}
            className="w-full h-32 object-cover rounded-md"
          />
        </div>
      )}

      {/* Conteúdo */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold line-clamp-1">{collection.name}</h3>
          {collection.is_active ? (
            <Badge variant="default" className="text-xs shrink-0">Ativa</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs shrink-0">Inativa</Badge>
          )}
        </div>

        {collection.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {collection.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ImageIcon className="h-3 w-3" />
          <span>{collection.character_count || 0} personagens</span>
        </div>
      </div>

      {/* Actions */}
      <div 
        className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="sm"
          variant="secondary"
          className="h-7 w-7 p-0"
          onClick={onEdit}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 w-7 p-0"
          onClick={() => {
            if (confirm("Tem certeza? Esta ação não pode ser desfeita.")) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// Componente: Card de Personagem Premium
function CharacterCardPremium({ character, onSuccess }: any) {
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
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-amber-500/10 text-amber-700 border-amber-500/20";
      case "revealed":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case "released":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      default:
        return "bg-muted";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "upcoming":
        return "Em breve";
      case "revealed":
        return "Revelado";
      case "released":
        return "Lançado";
      default:
        return status;
    }
  };

  return (
    <>
      <Card className="group border-border hover:shadow-lg transition-all overflow-hidden">
        {/* Imagem */}
        <div className="relative aspect-square bg-muted">
          {character.image_url ? (
            <img
              src={character.image_url}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-16 w-16 text-muted-foreground opacity-20" />
            </div>
          )}
          
          {/* Badge de Ordem */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="font-mono font-bold">
              #{character.release_order}
            </Badge>
          </div>

          {/* Actions */}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm("Tem certeza?")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Conteúdo */}
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold line-clamp-1">{character.name}</h4>
              <Badge className={cn("text-xs shrink-0", getStatusColor(character.status))}>
                {getStatusLabel(character.status)}
              </Badge>
            </div>

            {character.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {character.description}
              </p>
            )}

            {character.release_month && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{MONTHS[character.release_month - 1]}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
    </>
  );
}

// Componente: Vista de Calendário
function CalendarView({ characters }: any) {
  // Agrupar por mês
  const charactersByMonth = characters.reduce((acc: any, char: any) => {
    const month = char.release_month || 0;
    if (!acc[month]) acc[month] = [];
    acc[month].push(char);
    return acc;
  }, {});

  return (
    <Card className="border-border shadow-premium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendário de Lançamentos
        </CardTitle>
        <CardDescription>
          Visualização mensal dos personagens
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MONTHS.map((month, index) => {
            const monthChars = charactersByMonth[index + 1] || [];
            return (
              <div key={index} className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold mb-3 flex items-center justify-between">
                  <span>{month}</span>
                  <Badge variant="secondary">{monthChars.length}</Badge>
                </h4>
                {monthChars.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum lançamento</p>
                ) : (
                  <div className="space-y-2">
                    {monthChars.map((char: any) => (
                      <div key={char.id} className="text-sm p-2 rounded bg-muted/50">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            #{char.release_order}
                          </span>
                          <span className="font-medium">{char.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Dialog: Criar Coleção (continua no próximo arquivo devido ao tamanho)

// Dialog: Criar Coleção
function CreateCollectionDialog({ isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      let imageUrl = null;

      // Upload da imagem se houver
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${slug || name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.${fileExt}`;
        const filePath = `collections/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("models")
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("models")
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Criar coleção
      const { error } = await supabase
        .from("collections")
        .insert({
          name,
          slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
          description,
          is_active: isActive,
          image_url: imageUrl,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collections-v2"] });
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["active-collections"] });
      toast({ title: "Coleção criada com sucesso!" });
      setName("");
      setSlug("");
      setDescription("");
      setIsActive(true);
      setImageFile(null);
      setImagePreview(null);
      setIsUploading(false);
      onSuccess();
    },
    onError: (error: any) => {
      setIsUploading(false);
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
        <Button className="gap-2 shadow-lg">
          <Plus className="h-4 w-4" />
          Nova Coleção
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Criar Nova Coleção</DialogTitle>
          <DialogDescription>
            Crie uma coleção temática com 6 ou 12 personagens
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Upload de Imagem */}
          <div>
            <Label>Imagem da Coleção</Label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border-2 border-border"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Clique para fazer upload</span> ou arraste
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG ou WEBP (MAX. 5MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Nome */}
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

          {/* Slug */}
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
              URL: /colecoes/{slug || name.toLowerCase().replace(/\s+/g, "-") || "slug"}
            </p>
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a coleção e o que a torna especial..."
              className="mt-2 min-h-[120px]"
            />
          </div>

          {/* Ativa */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div>
              <Label className="text-base">Coleção Ativa</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Disponível para assinatura no site
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || createMutation.isPending || isUploading}
          >
            {isUploading ? "Fazendo upload..." : createMutation.isPending ? "Criando..." : "Criar Coleção"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Dialog: Editar Coleção
function EditCollectionDialog({ collection, isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState(collection.name);
  const [slug, setSlug] = useState(collection.slug);
  const [description, setDescription] = useState(collection.description || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(collection.image_url);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      let imageUrl = collection.image_url;

      // Upload da nova imagem se houver
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${slug}-${Date.now()}.${fileExt}`;
        const filePath = `collections/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("models")
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("models")
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from("collections")
        .update({ name, slug, description, image_url: imageUrl })
        .eq("id", collection.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collections-v2"] });
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["collection"] });
      qc.invalidateQueries({ queryKey: ["active-collections"] });
      toast({ title: "Coleção atualizada!" });
      setIsUploading(false);
      onSuccess();
    },
    onError: (error: any) => {
      setIsUploading(false);
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Editar Coleção</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Upload de Imagem */}
          <div>
            <Label>Imagem da Coleção</Label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border-2 border-border"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Clique para fazer upload</span>
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG ou WEBP</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>

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
              className="mt-2 min-h-[120px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!name.trim() || updateMutation.isPending || isUploading}
          >
            {isUploading ? "Fazendo upload..." : updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Dialog: Criar Personagem
function CreateCharacterDialog({ collectionId, maxOrder, onSuccess, trigger }: any) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [releaseOrder, setReleaseOrder] = useState(String(maxOrder + 1));
  const [releaseMonth, setReleaseMonth] = useState("");
  const [status, setStatus] = useState("upcoming");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      let imageUrl = null;

      // Upload da imagem se houver
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `char-${collectionId}-${releaseOrder}-${Date.now()}.${fileExt}`;
        const filePath = `characters/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("models")
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("models")
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from("collection_characters")
        .insert({
          collection_id: collectionId,
          name,
          description,
          release_order: parseInt(releaseOrder),
          release_month: releaseMonth ? parseInt(releaseMonth) : null,
          status,
          image_url: imageUrl,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Personagem adicionado!" });
      qc.invalidateQueries({ queryKey: ["admin-characters-v2"] });
      qc.invalidateQueries({ queryKey: ["admin-collections-v2"] });
      qc.invalidateQueries({ queryKey: ["collection"] });
      setName("");
      setDescription("");
      setReleaseOrder(String(maxOrder + 2));
      setReleaseMonth("");
      setStatus("upcoming");
      setImageFile(null);
      setImagePreview(null);
      setIsUploading(false);
      setIsOpen(false);
      onSuccess();
    },
    onError: (error: any) => {
      setIsUploading(false);
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
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Personagem
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Adicionar Personagem</DialogTitle>
          <DialogDescription>
            Adicione um novo personagem à coleção
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Upload de Imagem */}
          <div>
            <Label>Imagem do Personagem</Label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg border-2 border-border"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Clique para fazer upload</span>
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG ou WEBP</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="char-month">Mês de Lançamento</Label>
              <Select value={releaseMonth} onValueChange={setReleaseMonth}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index} value={String(index + 1)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>

          <div>
            <Label htmlFor="char-desc">Descrição</Label>
            <Textarea
              id="char-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do personagem, curiosidades, etc..."
              className="mt-2 min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || !releaseOrder || createMutation.isPending || isUploading}
          >
            {isUploading ? "Fazendo upload..." : createMutation.isPending ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Dialog: Editar Personagem
function EditCharacterDialog({ character, isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState(character.name);
  const [description, setDescription] = useState(character.description || "");
  const [releaseOrder, setReleaseOrder] = useState(String(character.release_order));
  const [releaseMonth, setReleaseMonth] = useState(character.release_month ? String(character.release_month) : "");
  const [status, setStatus] = useState(character.status);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(character.image_url);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      let imageUrl = character.image_url;

      // Upload da nova imagem se houver
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `char-${character.collection_id}-${releaseOrder}-${Date.now()}.${fileExt}`;
        const filePath = `characters/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("models")
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("models")
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from("collection_characters")
        .update({
          name,
          description,
          release_order: parseInt(releaseOrder),
          release_month: releaseMonth ? parseInt(releaseMonth) : null,
          status,
          image_url: imageUrl,
        })
        .eq("id", character.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-characters-v2"] });
      qc.invalidateQueries({ queryKey: ["admin-collections-v2"] });
      qc.invalidateQueries({ queryKey: ["collection"] });
      toast({ title: "Personagem atualizado!" });
      setIsUploading(false);
      onSuccess();
    },
    onError: (error: any) => {
      setIsUploading(false);
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Editar Personagem</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Upload de Imagem */}
          <div>
            <Label>Imagem do Personagem</Label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg border-2 border-border"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Clique para fazer upload</span>
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2"
              />
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Mês de Lançamento</Label>
              <Select value={releaseMonth} onValueChange={setReleaseMonth}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index} value={String(index + 1)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!name.trim() || updateMutation.isPending || isUploading}
          >
            {isUploading ? "Fazendo upload..." : updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
