/**
 * CreditCharactersContent - Gerenciamento de Personagens de Crédito
 * 
 * Componente extraído de AdminSubscriptionCreditCharacters para ser usado
 * como uma aba dentro do AdminCollectionsHub
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as adminCreditCharactersService from "@/hooks/admin/useAdminCreditCharactersData";
import { Plus, Edit, Trash2, Package, Coins, Layers } from "lucide-react";

type CatalogCharacterStatus = "released" | "coming_soon" | "upcoming" | "revealed";

const catalogCharacterStatuses = new Set<CatalogCharacterStatus>([
  "released",
  "coming_soon",
  "upcoming",
  "revealed",
]);

type PriceCategory = {
  id: string;
  name?: string;
  display_name: string;
  price_coins?: number;
  coin_value_in_cents?: number;
  price_standalone?: number;
  display_order?: number;
  is_active?: boolean;
};

type CatalogCharacter = {
  id: string;
  name: string;
  description?: string | null;
  price_category_id?: string | null;
  image_url?: string | null;
  is_catalog?: boolean;
  status?: CatalogCharacterStatus | null;
  theme_category?: string | null;
  product_line?: string | null;
  release_order?: number | null;
  price_categories?: PriceCategory | null;
};

function priceCoins(category: PriceCategory | null | undefined): number {
  return category?.price_coins ?? 0;
}

function coinValueInCents(category: PriceCategory | null | undefined): number {
  return category?.coin_value_in_cents ?? 200;
}

function standalonePriceInCents(category: PriceCategory | null | undefined): number {
  return category?.price_standalone ?? 0;
}

function normalizeCatalogCharacterStatus(status: string | null | undefined): CatalogCharacterStatus {
  return status && catalogCharacterStatuses.has(status as CatalogCharacterStatus)
    ? (status as CatalogCharacterStatus)
    : "released";
}

type CharacterFormDialogProps = {
  character: CatalogCharacter | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

type PriceCategoriesSectionProps = {
  categories: PriceCategory[];
  isLoading: boolean;
  isError: boolean;
  onCreateCategory: () => void;
  onEditCategory: (category: PriceCategory) => void;
};

type CategoryCardProps = {
  category: PriceCategory;
  onEdit: () => void;
  onDelete: () => void;
};

type PriceCategoryDialogProps = {
  category: PriceCategory | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

export function CreditCharactersContent() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<CatalogCharacter | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PriceCategory | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Fetch catalog characters from collection_characters table
  const charactersQuery = useQuery({
    queryKey: ["admin-catalog-characters"],
    queryFn: adminCreditCharactersService.fetchCatalogCharacters,
  });

  // Fetch price categories
  const categoriesQuery = useQuery({
    queryKey: ["admin-price-categories"],
    queryFn: adminCreditCharactersService.fetchPriceCategories,
  });

  const characters: CatalogCharacter[] = (charactersQuery.data || []).map((character) => ({
    ...character,
    status: normalizeCatalogCharacterStatus(character.status),
  }));
  const categories = categoriesQuery.data || [];

  // Filter characters by selected category
  const filteredCharacters = selectedCategory
    ? characters.filter((c: CatalogCharacter) => c.price_category_id === selectedCategory)
    : characters;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminCreditCharactersService.deleteCatalogCharacterById(id);
    },
    onSuccess: () => {
      toast({ title: "Personagem excluído com sucesso" });
      qc.invalidateQueries({ queryKey: ["admin-catalog-characters"] });
    },
    onError: () => {
      toast({ title: "Erro ao excluir personagem", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Personagens de Crédito</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Personagens disponíveis para compra com coins
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCategoryManager(!showCategoryManager)}>
            <Layers className="h-4 w-4 mr-2" />
            {showCategoryManager ? 'Ver Personagens' : 'Gerenciar Categorias'}
          </Button>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Personagem
          </Button>
        </div>
      </div>

      {/* Category Manager View */}
      {showCategoryManager ? (
        <PriceCategoriesSection
          categories={categories}
          isLoading={categoriesQuery.isLoading}
          isError={categoriesQuery.isError}
          onCreateCategory={() => setIsCreatingCategory(true)}
          onEditCategory={setEditingCategory}
        />
      ) : (
        <>
          {/* Category Filter Cards */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="h-auto py-3 px-4"
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-semibold">Todos</span>
                <span className="text-xs opacity-70">{characters.length} personagens</span>
              </div>
            </Button>

            {categories.map((category: PriceCategory) => {
              const count = characters.filter((c: CatalogCharacter) => c.price_category_id === category.id).length;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="h-auto py-3 px-4"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold">{category.display_name}</span>
                    <div className="flex items-center gap-2 text-xs opacity-70">
                      <span className="flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        {category.price_coins}
                      </span>
                      <span>•</span>
                      <span>{count} personagens</span>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Characters Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {charactersQuery.isLoading && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <p>Carregando personagens...</p>
              </div>
            )}

            {charactersQuery.isError && (
              <div className="col-span-full text-center py-12 text-destructive">
                <p>Erro ao carregar personagens</p>
              </div>
            )}

            {filteredCharacters.length === 0 && !charactersQuery.isLoading && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {selectedCategory 
                    ? 'Nenhum personagem nesta categoria' 
                    : 'Nenhum personagem cadastrado'}
                </p>
                {!selectedCategory && (
                  <Button onClick={() => setIsCreating(true)} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Personagem
                  </Button>
                )}
              </div>
            )}

            {filteredCharacters.map((character: CatalogCharacter) => (
              <Card key={character.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{character.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {character.description || "Sem descrição"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingCharacter(character)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Excluir personagem "${character.name}"?`)) {
                            deleteMutation.mutate(character.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Image */}
                    {character.image_url && (
                      <img
                        src={character.image_url}
                        alt={character.name}
                        className="w-full h-48 object-cover rounded-md"
                      />
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="font-mono">
                        {character.price_categories?.display_name || 'Sem Categoria'}
                      </Badge>
                      <Badge variant={character.status === 'released' ? 'default' : 'outline'}>
                        {character.status === 'released' ? 'Disponível' : 'Em breve'}
                      </Badge>
                      {character.theme_category && (
                        <Badge variant="outline">
                          {character.theme_category}
                        </Badge>
                      )}
                      {character.product_line && (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-500/20">
                          {character.product_line}
                        </Badge>
                      )}
                    </div>

                    {/* Prices */}
                    {character.price_categories && (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Coins className="h-3 w-3 text-blue-500" />
                          <span className="font-semibold text-blue-600">
                            {priceCoins(character.price_categories)} coins
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          R$ {(standalonePriceInCents(character.price_categories) / 100).toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Dialogs */}
      <CharacterFormDialog
        character={null}
        isOpen={isCreating}
        onOpenChange={setIsCreating}
        onSuccess={() => {
          setIsCreating(false);
          qc.invalidateQueries({ queryKey: ["admin-catalog-characters"] });
        }}
      />

      <CharacterFormDialog
        character={editingCharacter}
        isOpen={!!editingCharacter}
        onOpenChange={(open) => !open && setEditingCharacter(null)}
        onSuccess={() => {
          setEditingCharacter(null);
          qc.invalidateQueries({ queryKey: ["admin-catalog-characters"] });
        }}
      />

      <PriceCategoryDialog
        category={null}
        isOpen={isCreatingCategory}
        onOpenChange={setIsCreatingCategory}
        onSuccess={() => {
          setIsCreatingCategory(false);
          qc.invalidateQueries({ queryKey: ["admin-price-categories"] });
        }}
      />

      <PriceCategoryDialog
        category={editingCategory}
        isOpen={!!editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
        onSuccess={() => {
          setEditingCategory(null);
          qc.invalidateQueries({ queryKey: ["admin-price-categories"] });
        }}
      />
    </div>
  );
}

// Character Form Dialog Component
type CharacterFormData = {
  name: string;
  description: string;
  status: CatalogCharacterStatus;
  price_category_id: string;
  theme_category: string;
  product_line: string;
  image_url: string;
  is_catalog: boolean;
};

function CharacterFormDialog({ character, isOpen, onOpenChange, onSuccess }: CharacterFormDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<CharacterFormData>({
    name: "",
    description: "",
    status: "released",
    price_category_id: "",
    theme_category: "",
    product_line: "",
    image_url: "",
    is_catalog: true,
  });

  // Update form when character changes
  useEffect(() => {
    if (character) {
      setFormData({
        name: character.name || "",
        description: character.description || "",
        status: normalizeCatalogCharacterStatus(character.status),
        price_category_id: character.price_category_id || "",
        theme_category: character.theme_category || "",
        product_line: character.product_line || "",
        image_url: character.image_url || "",
        is_catalog: character.is_catalog ?? true,
      });
    } else {
      // Reset form for new character
      setFormData({
        name: "",
        description: "",
        status: "released",
        price_category_id: "",
        theme_category: "",
        product_line: "",
        image_url: "",
        is_catalog: true,
      });
    }
  }, [character, isOpen]);

  // Fetch price categories for dropdown
  const { data: categories } = useQuery({
    queryKey: ["admin-price-categories"],
    queryFn: adminCreditCharactersService.fetchPriceCategories,
  });

  // Fetch existing theme categories for suggestions
  const { data: existingThemes } = useQuery({
    queryKey: ["admin-theme-categories"],
    queryFn: adminCreditCharactersService.fetchUniqueThemeCategories,
  });

  // Fetch existing product lines for suggestions
  const { data: existingProductLines } = useQuery({
    queryKey: ["admin-product-lines"],
    queryFn: adminCreditCharactersService.fetchUniqueProductLines,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: CharacterFormData) => {
      await adminCreditCharactersService.saveCatalogCharacter(character?.id ?? null, data);
    },
    onSuccess: () => {
      toast({ title: character ? "Personagem atualizado" : "Personagem criado" });
      onSuccess();
    },
    onError: (error: unknown) => {
      toast({ 
        title: "Erro ao salvar personagem", 
        description: getErrorMessage(error),
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {character ? "Editar Personagem" : "Novo Personagem"}
          </DialogTitle>
          <DialogDescription>
            {character
              ? "Atualize as informações do personagem"
              : "Crie um novo personagem para o catálogo de créditos"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Personagem *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Homem de Ferro, Batman, Naruto..."
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="theme_category">Categoria Temática</Label>
              <Input
                id="theme_category"
                list="theme-categories"
                value={formData.theme_category}
                onChange={(e) => setFormData({ ...formData, theme_category: e.target.value })}
                placeholder="Ex: Marvel, DC, Anime, Games..."
              />
              <datalist id="theme-categories">
                <option value="Marvel" />
                <option value="DC Comics" />
                <option value="Anime" />
                <option value="Games" />
                <option value="Filmes" />
                <option value="Séries" />
                <option value="Desenhos" />
                {existingThemes?.map((theme) => (
                  <option key={theme} value={theme} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Digite ou selecione uma categoria existente
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_line">Linha de Produto</Label>
              <Input
                id="product_line"
                list="product-lines"
                value={formData.product_line}
                onChange={(e) => setFormData({ ...formData, product_line: e.target.value })}
                placeholder="Ex: Vingadores, Liga da Justiça, Akatsuki..."
              />
              <datalist id="product-lines">
                <option value="Vingadores" />
                <option value="Liga da Justiça" />
                <option value="X-Men" />
                <option value="Akatsuki" />
                <option value="Chapéu de Palha" />
                {existingProductLines?.map((line) => (
                  <option key={line} value={line} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Digite ou selecione uma linha existente
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Descreva o personagem..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price_category_id">Categoria de Preço (Tier) *</Label>
            <Select
              value={formData.price_category_id}
              onValueChange={(value) => setFormData({ ...formData, price_category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat: PriceCategory) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center justify-between gap-4 w-full">
                      <span className="font-semibold">{cat.display_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {priceCoins(cat)} coins • R$ {(standalonePriceInCents(cat) / 100).toFixed(0)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.price_category_id && categories && (
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const selectedCat = categories.find((c: PriceCategory) => c.id === formData.price_category_id);
                  if (!selectedCat) return null;
                  return `Preço: ${priceCoins(selectedCat)} coins (≈ R$ ${((priceCoins(selectedCat) * coinValueInCents(selectedCat)) / 100).toFixed(2)}) ou R$ ${(standalonePriceInCents(selectedCat) / 100).toFixed(2)} avulso`;
                })()}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => {
                if (catalogCharacterStatuses.has(value as CatalogCharacterStatus)) {
                  setFormData({ ...formData, status: value as CatalogCharacterStatus });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="released">Disponível</SelectItem>
                <SelectItem value="coming_soon">Em breve</SelectItem>
                <SelectItem value="upcoming">Planejado</SelectItem>
                <SelectItem value="revealed">Revelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">URL da Imagem</Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://..."
            />
            {formData.image_url && (
              <div className="mt-2">
                <img
                  src={formData.image_url}
                  alt="Preview"
                  className="w-full max-w-xs h-48 object-cover rounded-md border"
                  onError={(e) => {
                    e.currentTarget.src = '';
                    e.currentTarget.alt = 'Erro ao carregar imagem';
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_catalog"
              checked={formData.is_catalog}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_catalog: checked as boolean })
              }
            />
            <Label htmlFor="is_catalog" className="cursor-pointer">
              Disponível no catálogo
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
            >
              {character ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


// Price Categories Section Component
function PriceCategoriesSection({
  categories,
  isLoading,
  isError,
  onCreateCategory,
  onEditCategory,
}: PriceCategoriesSectionProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const characterCount = await adminCreditCharactersService.countCharactersByPriceCategory(id);

      if (characterCount > 0) {
        throw new Error('Não é possível excluir uma categoria que possui personagens vinculados');
      }

      await adminCreditCharactersService.deletePriceCategory(id);
    },
    onSuccess: () => {
      toast({ title: "Categoria excluída com sucesso" });
      qc.invalidateQueries({ queryKey: ["admin-price-categories"] });
    },
    onError: (error: unknown) => {
      toast({ 
        title: "Erro ao excluir categoria", 
        description: getErrorMessage(error),
        variant: "destructive" 
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Categorias de Preço</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Defina os níveis de preço para os personagens do catálogo
          </p>
        </div>
        <Button onClick={onCreateCategory}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p>Carregando categorias...</p>
          </div>
        )}

        {isError && (
          <div className="col-span-full text-center py-12 text-destructive">
            <p>Erro ao carregar categorias</p>
          </div>
        )}

        {categories.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma categoria cadastrada</p>
            <Button onClick={onCreateCategory} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Categoria
            </Button>
          </div>
        )}

        {categories.map((category: PriceCategory) => (
          <CategoryCard
            key={category.id}
            category={category}
            onEdit={() => onEditCategory(category)}
            onDelete={() => {
              if (confirm(`Excluir categoria "${category.display_name}"?`)) {
                deleteCategoryMutation.mutate(category.id);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Category Card Component
function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const { data: characterCount = 0 } = useQuery({
    queryKey: ["admin-price-category-character-count", category.id],
    queryFn: () => adminCreditCharactersService.countCharactersByPriceCategory(category.id),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{category.display_name}</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Prices */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Coins className="h-3 w-3 text-blue-500" />
                Coins
              </p>
              <p className="text-lg font-bold text-blue-600">{priceCoins(category)}</p>
            </div>

            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs text-muted-foreground mb-1">Em Coins</p>
              <p className="text-lg font-bold text-purple-600">
                R$ {((priceCoins(category) * coinValueInCents(category)) / 100).toFixed(0)}
              </p>
            </div>

            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-muted-foreground mb-1">Avulso</p>
              <p className="text-lg font-bold text-green-600">
                R$ {(standalonePriceInCents(category) / 100).toFixed(0)}
              </p>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="text-xs text-muted-foreground text-center py-2 border-t border-b">
            1 coin = R$ {(coinValueInCents(category) / 100).toFixed(2)}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Personagens</span>
            <Badge variant="secondary">{characterCount}</Badge>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={category.is_active ? 'default' : 'secondary'}>
              {category.is_active ? 'Ativa' : 'Inativa'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Price Category Dialog Component
type PriceCategoryFormData = {
  name: string;
  display_name: string;
  price_coins: number;
  coin_value_in_cents: number;
  price_standalone: number;
  display_order: number;
  is_active: boolean;
};

function PriceCategoryDialog({ category, isOpen, onOpenChange, onSuccess }: PriceCategoryDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<PriceCategoryFormData>({
    name: category?.name || "",
    display_name: category?.display_name || "",
    price_coins: category?.price_coins || 0,
    coin_value_in_cents: category?.coin_value_in_cents || 200,
    price_standalone: category?.price_standalone ? category.price_standalone / 100 : 0,
    display_order: category?.display_order || 0,
    is_active: category?.is_active ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: PriceCategoryFormData) => {
      await adminCreditCharactersService.savePriceCategory(category?.id ?? null, data);
    },
    onSuccess: () => {
      toast({ title: category ? "Categoria atualizada" : "Categoria criada" });
      onSuccess();
    },
    onError: (error: unknown) => {
      toast({ 
        title: "Erro ao salvar categoria", 
        description: getErrorMessage(error),
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      price_coins: Number(formData.price_coins),
      coin_value_in_cents: Number(formData.coin_value_in_cents),
      price_standalone: Number(formData.price_standalone) * 100, // Convert to cents
      display_order: Number(formData.display_order),
    };

    saveMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {category ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
          <DialogDescription>
            {category
              ? "Atualize as informações da categoria de preço"
              : "Crie uma nova categoria de preço para os personagens"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome (slug) *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="standard, premium, ultra..."
                required
              />
              <p className="text-xs text-muted-foreground">
                Identificador único (sem espaços, minúsculas)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Nome de Exibição *</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Padrão, Premium, Ultra Raro..."
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="price_coins">Preço em Coins *</Label>
              <Input
                id="price_coins"
                type="number"
                min="0"
                value={formData.price_coins}
                onChange={(e) => setFormData({ ...formData, price_coins: Number(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coin_value_in_cents">Valor do Coin (R$) *</Label>
              <Input
                id="coin_value_in_cents"
                type="number"
                min="0"
                step="0.01"
                value={formData.coin_value_in_cents / 100}
                onChange={(e) => setFormData({ ...formData, coin_value_in_cents: parseFloat(e.target.value) * 100 || 0 })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Quanto custa 1 coin
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_standalone">Preço Avulso (R$) *</Label>
              <Input
                id="price_standalone"
                type="number"
                min="0"
                step="0.01"
                value={formData.price_standalone}
                onChange={(e) => setFormData({ ...formData, price_standalone: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Ordem</Label>
              <Input
                id="display_order"
                type="number"
                min="0"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Price Comparison */}
          {formData.price_coins > 0 && formData.coin_value_in_cents > 0 && (
            <div className="p-4 rounded-lg bg-muted border">
              <h4 className="text-sm font-semibold mb-3">Comparação de Preços</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Custo em Coins</p>
                  <p className="text-lg font-bold text-purple-600">
                    R$ {((formData.price_coins * formData.coin_value_in_cents) / 100).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formData.price_coins} × R$ {(formData.coin_value_in_cents / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Preço Avulso</p>
                  <p className="text-lg font-bold text-green-600">
                    R$ {formData.price_standalone.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Diferença</p>
                  <p className={`text-lg font-bold ${
                    (formData.price_standalone - ((formData.price_coins * formData.coin_value_in_cents) / 100)) > 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    R$ {Math.abs(formData.price_standalone - ((formData.price_coins * formData.coin_value_in_cents) / 100)).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(formData.price_standalone - ((formData.price_coins * formData.coin_value_in_cents) / 100)) > 0 
                      ? 'Economia comprando coins' 
                      : 'Mais caro em coins'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked as boolean })
              }
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Categoria ativa (visível no sistema)
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {category ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
