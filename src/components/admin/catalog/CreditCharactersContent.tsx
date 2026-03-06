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
import { Plus, Edit, Trash2, Star, Package, Coins } from "lucide-react";

export function CreditCharactersContent() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<any>(null);

  // Fetch all characters
  const charactersQuery = useQuery({
    queryKey: ["admin-subscription-credit-characters"],
    queryFn: () => subscriptionCreditAPI.getCharacters(1, 100),
  });

  const characters = charactersQuery.data?.characters || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => subscriptionCreditAdminAPI.deleteCharacter(id),
    onSuccess: () => {
      toast({ title: "Personagem excluído com sucesso" });
      qc.invalidateQueries({ queryKey: ["admin-subscription-credit-characters"] });
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
            Personagens disponíveis para compra com coins (sistema de assinatura)
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
          <Card key={character.id} className={!character.isActive ? "opacity-60" : ""}>
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
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {!character.isActive && <Badge variant="secondary">Inativo</Badge>}
                  {character.isExclusiveSemestral && (
                    <Badge className="bg-purple-500">
                      <Star className="h-3 w-3 mr-1" />
                      Exclusivo Semestral
                    </Badge>
                  )}
                  {character.isStandardCollection && (
                    <Badge variant="outline">Coleção Padrão</Badge>
                  )}
                  <Badge variant="secondary" className="font-mono">
                    {character.rarity}
                  </Badge>
                </div>

                {/* Prices */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Coins className="h-3 w-3 text-blue-500" />
                    <span className="font-semibold text-blue-600">
                      {character.costInCredits} coins
                    </span>
                  </div>
                  {character.priceInReais > 0 && (
                    <div className="text-muted-foreground">
                      R$ {character.priceInReais.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Stock */}
                {character.stockQuantity !== null && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Estoque: </span>
                    <span className={character.stockQuantity > 0 ? "text-green-600" : "text-red-600"}>
                      {character.stockQuantity} unidades
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialogs */}
      <CharacterFormDialog
        character={null}
        isOpen={isCreating}
        onOpenChange={setIsCreating}
        onSuccess={() => {
          setIsCreating(false);
          qc.invalidateQueries({ queryKey: ["admin-subscription-credit-characters"] });
        }}
      />

      <CharacterFormDialog
        character={editingCharacter}
        isOpen={!!editingCharacter}
        onOpenChange={(open) => !open && setEditingCharacter(null)}
        onSuccess={() => {
          setEditingCharacter(null);
          qc.invalidateQueries({ queryKey: ["admin-subscription-credit-characters"] });
        }}
      />
    </div>
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
