// @ts-nocheck
/**
 * CreditCharactersContent - Gerenciamento de Personagens de Crédito
 * 
 * Componente extraído de AdminSubscriptionCreditCharacters para ser usado
 * como uma aba dentro do AdminCollectionsHub
 */

import { useState } from "react";
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
import { subscriptionCreditAdminAPI } from "@/services/subscription-credit-admin-api";
import { subscriptionCreditAPI } from "@/services/subscription-credit-api";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Star, Package, Coins, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CreditCharactersContent() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<any>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  // Fetch catalog characters from collection_characters table
  const charactersQuery = useQuery({
    queryKey: ["admin-catalog-characters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_characters')
        .select(`
          *,
          price_categories (
            id,
            name,
            display_name,
            price_coins,
            price_standalone
          )
        `)
        .eq('is_catalog', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch price categories
  const categoriesQuery = useQuery({
    queryKey: ["admin-price-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_categories')
        .select('*')
        .order('display_order');

      if (error) throw error;
      return data || [];
    },
  });

  const characters = charactersQuery.data || [];
  const categories = categoriesQuery.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('collection_characters')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
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
    <Tabs defaultValue="characters" className="space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="characters">
          <Package className="h-4 w-4 mr-2" />
          Personagens
        </TabsTrigger>
        <TabsTrigger value="categories">
          <Layers className="h-4 w-4 mr-2" />
          Categorias de Preço
        </TabsTrigger>
      </TabsList>

      {/* Tab: Personagens */}
      <TabsContent value="characters" className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Personagens de Crédito</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Personagens disponíveis para compra com coins
            </p>
          </div>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Personagem
          </Button>
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

          {characters.length === 0 && !charactersQuery.isLoading && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum personagem cadastrado</p>
              <Button onClick={() => setIsCreating(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Personagem
              </Button>
            </div>
          )}

          {characters.map((character: any) => (
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
                  </div>

                  {/* Prices */}
                  {character.price_categories && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3 text-blue-500" />
                        <span className="font-semibold text-blue-600">
                          {character.price_categories.price_coins} coins
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        R$ {(character.price_categories.price_standalone / 100).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* Tab: Categorias de Preço */}
      <TabsContent value="categories" className="space-y-6">
        <PriceCategoriesSection
          categories={categories}
          isLoading={categoriesQuery.isLoading}
          isError={categoriesQuery.isError}
          onCreateCategory={() => setIsCreatingCategory(true)}
          onEditCategory={setEditingCategory}
          onRefresh={() => qc.invalidateQueries({ queryKey: ["admin-price-categories"] })}
        />
      </TabsContent>

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
    </Tabs>
  );
}

// Character Form Dialog Component
function CharacterFormDialog({ character, isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: character?.name || "",
    description: character?.description || "",
    rarity: character?.rarity || "common",
    costInCredits: character?.costInCredits || 0,
    priceInReais: character?.priceInReais || 0,
    stockQuantity: character?.stockQuantity ?? null,
    isActive: character?.isActive ?? true,
    isExclusiveSemestral: character?.isExclusiveSemestral || false,
    isStandardCollection: character?.isStandardCollection || false,
    imageUrl: character?.imageUrl || "",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => subscriptionCreditAdminAPI.createCharacter(data),
    onSuccess: () => {
      toast({ title: "Personagem criado com sucesso" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Erro ao criar personagem", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      subscriptionCreditAdminAPI.updateCharacter(character.id, data),
    onSuccess: () => {
      toast({ title: "Personagem atualizado com sucesso" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar personagem", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      costInCredits: Number(formData.costInCredits),
      priceInReais: Number(formData.priceInReais),
      stockQuantity: formData.stockQuantity === "" ? null : Number(formData.stockQuantity),
    };

    if (character) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rarity">Raridade *</Label>
              <Select
                value={formData.rarity}
                onValueChange={(value) => setFormData({ ...formData, rarity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">Common</SelectItem>
                  <SelectItem value="rare">Rare</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                  <SelectItem value="legendary">Legendary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="costInCredits">Custo em Coins *</Label>
              <Input
                id="costInCredits"
                type="number"
                min="0"
                value={formData.costInCredits}
                onChange={(e) =>
                  setFormData({ ...formData, costInCredits: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priceInReais">Preço em R$</Label>
              <Input
                id="priceInReais"
                type="number"
                min="0"
                step="0.01"
                value={formData.priceInReais}
                onChange={(e) =>
                  setFormData({ ...formData, priceInReais: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockQuantity">Estoque</Label>
              <Input
                id="stockQuantity"
                type="number"
                min="0"
                value={formData.stockQuantity ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, stockQuantity: e.target.value })
                }
                placeholder="Ilimitado"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">URL da Imagem</Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked as boolean })
                }
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Ativo (visível no catálogo)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isExclusiveSemestral"
                checked={formData.isExclusiveSemestral}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isExclusiveSemestral: checked as boolean })
                }
              />
              <Label htmlFor="isExclusiveSemestral" className="cursor-pointer">
                Exclusivo para plano semestral
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isStandardCollection"
                checked={formData.isStandardCollection}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isStandardCollection: checked as boolean })
                }
              />
              <Label htmlFor="isStandardCollection" className="cursor-pointer">
                Incluir na coleção padrão
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
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
function PriceCategoriesSection({ categories, isLoading, isError, onCreateCategory, onEditCategory, onRefresh }: any) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check if any characters use this category
      const { data: characters, error: checkError } = await supabase
        .from('collection_characters')
        .select('id')
        .eq('price_category_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (characters && characters.length > 0) {
        throw new Error('Não é possível excluir uma categoria que possui personagens vinculados');
      }

      const { error } = await supabase
        .from('price_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Categoria excluída com sucesso" });
      qc.invalidateQueries({ queryKey: ["admin-price-categories"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao excluir categoria", 
        description: error.message,
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

        {categories.map((category: any) => (
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
function CategoryCard({ category, onEdit, onDelete }: any) {
  const [characterCount, setCharacterCount] = useState(0);

  // Count characters using this category
  useState(() => {
    supabase
      .from('collection_characters')
      .select('id', { count: 'exact', head: true })
      .eq('price_category_id', category.id)
      .then(({ count }) => setCharacterCount(count || 0));
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{category.display_name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {category.description || "Sem descrição"}
            </CardDescription>
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
              <p className="text-lg font-bold text-blue-600">{category.price_coins}</p>
            </div>

            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs text-muted-foreground mb-1">Em Coins</p>
              <p className="text-lg font-bold text-purple-600">
                R$ {((category.price_coins * (category.coin_value_in_cents || 200)) / 100).toFixed(0)}
              </p>
            </div>

            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-muted-foreground mb-1">Avulso</p>
              <p className="text-lg font-bold text-green-600">
                R$ {(category.price_standalone / 100).toFixed(0)}
              </p>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="text-xs text-muted-foreground text-center py-2 border-t border-b">
            1 coin = R$ {((category.coin_value_in_cents || 200) / 100).toFixed(2)}
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
function PriceCategoryDialog({ category, isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: category?.name || "",
    display_name: category?.display_name || "",
    description: category?.description || "",
    price_coins: category?.price_coins || 0,
    coin_value_in_cents: category?.coin_value_in_cents || 200,
    price_standalone: category?.price_standalone || 0,
    display_order: category?.display_order || 0,
    is_active: category?.is_active ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (category) {
        // Update
        const { error } = await supabase
          .from('price_categories')
          .update(data)
          .eq('id', category.id);
        
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('price_categories')
          .insert(data);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: category ? "Categoria atualizada" : "Categoria criada" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao salvar categoria", 
        description: error.message,
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

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Descrição da categoria..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="price_coins">Preço em Coins *</Label>
              <Input
                id="price_coins"
                type="number"
                min="0"
                value={formData.price_coins}
                onChange={(e) => setFormData({ ...formData, price_coins: e.target.value })}
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
                value={formData.price_standalone / 100}
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
                onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
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
                    R$ {(formData.price_standalone / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Diferença</p>
                  <p className={`text-lg font-bold ${
                    (formData.price_standalone - (formData.price_coins * formData.coin_value_in_cents)) > 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    R$ {Math.abs((formData.price_standalone - (formData.price_coins * formData.coin_value_in_cents)) / 100).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(formData.price_standalone - (formData.price_coins * formData.coin_value_in_cents)) > 0 
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
