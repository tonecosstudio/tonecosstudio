/**
 * Modal de Troca de Coleção Ativa
 * Permite ao assinante trocar sua coleção ativa
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}

interface ChangeActiveCollectionDialogProps {
  subscriptionId: string;
  currentCollectionId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangeActiveCollectionDialog({
  subscriptionId,
  currentCollectionId,
  isOpen,
  onOpenChange,
}: ChangeActiveCollectionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(
    currentCollectionId
  );

  // Buscar coleções disponíveis
  const { data: collections, isLoading: isLoadingCollections } = useQuery({
    queryKey: ["available-collections"],
    enabled: isOpen,
    queryFn: async (): Promise<Collection[]> => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, name, slug, description, is_active")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  // Mutation para trocar coleção ativa
  const changeCollectionMutation = useMutation({
    mutationFn: async (newCollectionId: string) => {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          active_collection_id: newCollectionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-coins", subscriptionId] });

      toast({
        title: "Coleção ativa atualizada!",
        description: "Os preços dos personagens foram recalculados.",
      });

      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao trocar coleção",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConfirm = () => {
    if (!selectedCollectionId) {
      toast({
        title: "Selecione uma coleção",
        description: "Você precisa selecionar uma coleção para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (selectedCollectionId === currentCollectionId) {
      toast({
        title: "Mesma coleção",
        description: "Você já tem esta coleção como ativa.",
        variant: "destructive",
      });
      return;
    }

    changeCollectionMutation.mutate(selectedCollectionId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Trocar Coleção Ativa
          </DialogTitle>
          <DialogDescription>
            Escolha uma nova coleção ativa. Personagens desta coleção custarão 200 coins.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Alerta Informativo */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Como funciona</AlertTitle>
            <AlertDescription className="text-sm space-y-2">
              <p>
                • Personagens da <strong>coleção ativa</strong> custam <strong>200 coins</strong>
              </p>
              <p>
                • Personagens de <strong>outras coleções</strong> custam{" "}
                <strong>240-450 coins</strong>
              </p>
              <p>• Você pode trocar a coleção ativa a qualquer momento</p>
              <p>• Os preços serão recalculados automaticamente</p>
            </AlertDescription>
          </Alert>

          {/* Loading State */}
          {isLoadingCollections && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Lista de Coleções */}
          {!isLoadingCollections && collections && collections.length > 0 && (
            <RadioGroup
              value={selectedCollectionId || ""}
              onValueChange={setSelectedCollectionId}
              className="space-y-3"
            >
              {collections.map((collection) => {
                const isCurrentActive = collection.id === currentCollectionId;
                const isSelected = collection.id === selectedCollectionId;

                return (
                  <div
                    key={collection.id}
                    className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedCollectionId(collection.id)}
                  >
                    <RadioGroupItem value={collection.id} id={collection.id} className="mt-1" />
                    <div className="flex-1">
                      <Label
                        htmlFor={collection.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <span className="font-semibold text-base">{collection.name}</span>
                        {isCurrentActive && (
                          <Badge variant="secondary" className="bg-green-500 text-white">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Atual
                          </Badge>
                        )}
                      </Label>
                      {collection.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {collection.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          200 coins
                        </Badge>
                        <span className="text-xs text-muted-foreground">(preço prioritário)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          )}

          {/* Empty State */}
          {!isLoadingCollections && (!collections || collections.length === 0) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Nenhuma coleção disponível no momento.</AlertDescription>
            </Alert>
          )}

          {/* Aviso sobre Escolhas Existentes */}
          {selectedCollectionId && selectedCollectionId !== currentCollectionId && (
            <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900 dark:text-amber-100">Atenção</AlertTitle>
              <AlertDescription className="text-amber-900 dark:text-amber-100 text-sm">
                <p>Ao trocar a coleção ativa, os preços dos personagens serão recalculados:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    Personagens da <strong>nova coleção ativa</strong> passarão a custar{" "}
                    <strong>200 coins</strong>
                  </li>
                  <li>
                    Personagens da <strong>coleção anterior</strong> passarão a custar{" "}
                    <strong>240+ coins</strong>
                  </li>
                  <li>
                    Suas <strong>escolhas já feitas</strong> não serão alteradas
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={changeCollectionMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              changeCollectionMutation.isPending ||
              !selectedCollectionId ||
              selectedCollectionId === currentCollectionId
            }
          >
            {changeCollectionMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirmar Troca
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
