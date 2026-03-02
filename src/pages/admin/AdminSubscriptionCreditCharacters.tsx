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
import { AdminLayout } from "@/components/admin/AdminLayout";
import SEOHead from "@/components/SEOHead";
import { subscriptionCreditAdminAPI } from "@/services/subscription-credit-admin-api";
import { subscriptionCreditAPI } from "@/services/subscription-credit-api";
import { Plus, Edit, Trash2, Star, Package } from "lucide-react";

export default function AdminSubscriptionCreditCharacters() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<any>(null);

  // Fetch all characters (no plan filter for admin)
  const charactersQuery = useQuery({
    queryKey: ["admin-subscription-credit-characters"],
    queryFn: () => subscriptionCreditAPI.getCharacters(1, 100),
  });

  const characters = charactersQuery.data?.characters || [];

  return (
    <>
      <SEOHead
        title="Admin - Gerenciar Personagens"
        description="Gerenciar personagens do catálogo"
        noindex={true}
      />

      <AdminLayout>
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciar Personagens</h1>
            <p className="text-muted-foreground mt-2">
              Crie e edite personagens do catálogo de assinaturas
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
                  </div>

                  {/* Prices */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Preço (R$):</span>
                      <p className="font-bold text-green-600">
                        R$ {character.priceCash.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Créditos:</span>
                      <p className="font-bold text-blue-600">{character.priceCredits}</p>
                    </div>
                  </div>

                  {/* Image */}
                  {character.imageUrl && (
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={character.imageUrl}
                        alt={character.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Dialog */}
        {isCreating && (
          <CharacterFormDialog
            isOpen={isCreating}
            onOpenChange={setIsCreating}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ["admin-subscription-credit-characters"] });
              setIsCreating(false);
            }}
          />
        )}

        {/* Edit Dialog */}
        {editingCharacter && (
          <CharacterFormDialog
            character={editingCharacter}
            isOpen={Boolean(editingCharacter)}
            onOpenChange={(open: boolean) => !open && setEditingCharacter(null)}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ["admin-subscription-credit-characters"] });
              setEditingCharacter(null);
            }}
          />
        )}
      </AdminLayout>
    </>
  );
}

// Dialog: Character Form (Create/Edit)
function CharacterFormDialog({ character, isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const isEditing = Boolean(character);

  const [formData, setFormData] = useState({
    name: character?.name || "",
    description: character?.description || "",
    priceCash: character?.priceCash || "",
    priceCredits: character?.priceCredits || "",
    isExclusiveSemestral: character?.isExclusiveSemestral || false,
    isStandardCollection: character?.isStandardCollection || false,
    isActive: character?.isActive ?? true,
    imageUrl: character?.imageUrl || "",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        name: formData.name,
        description: formData.description || undefined,
        priceCash: parseFloat(formData.priceCash as any),
        priceCredits: parseInt(formData.priceCredits as any, 10),
        isExclusiveSemestral: formData.isExclusiveSemestral,
        isStandardCollection: formData.isStandardCollection,
        isActive: formData.isActive,
        imageUrl: formData.imageUrl || undefined,
      };

      if (isEditing) {
        return subscriptionCreditAdminAPI.updateCharacter(character.id, data);
      } else {
        return subscriptionCreditAdminAPI.createCharacter(data);
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Personagem atualizado!" : "Personagem criado!",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => subscriptionCreditAdminAPI.deactivateCharacter(character.id),
    onSuccess: () => {
      toast({
        title: "Personagem desativado!",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao desativar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Personagem" : "Novo Personagem"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize as informações do personagem" : "Crie um novo personagem"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Nome *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Naruto Uzumaki"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do personagem..."
              className="mt-2"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Preço em Dinheiro (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.priceCash}
                onChange={(e) => setFormData({ ...formData, priceCash: e.target.value })}
                placeholder="Ex: 49.90"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Preço em Créditos *</Label>
              <Input
                type="number"
                value={formData.priceCredits}
                onChange={(e) => setFormData({ ...formData, priceCredits: e.target.value })}
                placeholder="Ex: 200"
                className="mt-2"
              />
            </div>
          </div>

          <div>
            <Label>URL da Imagem</Label>
            <Input
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://..."
              className="mt-2"
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exclusive"
                checked={formData.isExclusiveSemestral}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isExclusiveSemestral: checked as boolean })
                }
              />
              <label htmlFor="exclusive" className="text-sm font-medium cursor-pointer">
                Exclusivo para plano semestral
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="standard"
                checked={formData.isStandardCollection}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isStandardCollection: checked as boolean })
                }
              />
              <label htmlFor="standard" className="text-sm font-medium cursor-pointer">
                Faz parte da coleção padrão
              </label>
            </div>

            {isEditing && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked as boolean })
                  }
                />
                <label htmlFor="active" className="text-sm font-medium cursor-pointer">
                  Personagem ativo
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between">
          <div>
            {isEditing && (
              <Button
                variant="destructive"
                onClick={() => deactivateMutation.mutate()}
                disabled={deactivateMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deactivateMutation.isPending ? "Desativando..." : "Desativar"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
