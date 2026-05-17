/**
 * CollectionTierAssignmentDialog - Dialog para atribuir coleções a um nível
 */

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface CollectionTierAssignmentDialogProps {
  tierId: string;
  tierName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface CollectionAssignmentRow {
  id: string;
  name: string;
  tier_id: string | null;
}

interface CollectionQueryRow {
  id: string;
  name: string;
  collection_tier_assignments: Array<{ tier_id: string | null }> | null;
}

export function CollectionTierAssignmentDialog({
  tierId,
  tierName,
  open,
  onOpenChange,
  onSuccess,
}: CollectionTierAssignmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Buscar todas as coleções e suas atribuições
  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections-for-assignment", tierId],
    queryFn: async () => {
      // @ts-expect-error - Tabelas existem mas tipos podem estar desatualizados
      const { data, error } = await supabase
        .from("collections")
        .select(`
          id,
          name,
          collection_tier_assignments (
            tier_id
          )
        `)
        .order("name");

      if (error) throw error;
      
      return (data as CollectionQueryRow[]).map((col) => ({
        id: col.id,
        name: col.name,
        tier_id: col.collection_tier_assignments?.[0]?.tier_id || null,
      }));
    },
    enabled: open,
  });

  // Inicializar seleção com coleções já atribuídas
  useEffect(() => {
    if (collections && open) {
      const assigned = collections
        .filter((c: CollectionAssignmentRow) => c.tier_id === tierId)
        .map((c: CollectionAssignmentRow) => c.id);
      setSelectedCollections(assigned);
    }
  }, [collections, open, tierId]);

  const handleToggle = (collectionId: string) => {
    setSelectedCollections((prev) =>
      prev.includes(collectionId)
        ? prev.filter((id) => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Desatribuir todas as coleções deste nível
      // @ts-expect-error - Tabela collection_tier_assignments existe mas tipos podem estar desatualizados
      const { error: unassignError } = await supabase
        .from("collection_tier_assignments")
        .delete()
        .eq("tier_id", tierId);

      if (unassignError) throw unassignError;

      // Atribuir coleções selecionadas
      if (selectedCollections.length > 0) {
        const assignments = selectedCollections.map((collectionId) => ({
          collection_id: collectionId,
          tier_id: tierId,
        }));

        // @ts-expect-error - Tabela collection_tier_assignments existe mas tipos podem estar desatualizados
        const { error: assignError } = await supabase
          .from("collection_tier_assignments")
          // @ts-expect-error - Tipos serão regenerados após aplicar migration
          .insert(assignments);

        if (assignError) throw assignError;
      }

      toast({
        title: "Coleções atualizadas",
        description: `${selectedCollections.length} coleções atribuídas ao nível ${tierName}`,
      });

      queryClient.invalidateQueries({ queryKey: ["pricing-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["collections-for-assignment"] });
      queryClient.invalidateQueries({ queryKey: ["collections-by-tier"] });
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao atribuir coleções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atribuir as coleções",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atribuir Coleções ao Nível {tierName}</DialogTitle>
          <DialogDescription>
            Selecione as coleções que devem usar este nível de preço
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {collections && collections.length > 0 ? (
              <div className="space-y-3">
                {collections.map((collection) => (
                  <div
                    key={collection.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={collection.id}
                      checked={selectedCollections.includes(collection.id)}
                      onCheckedChange={() => handleToggle(collection.id)}
                    />
                    <Label
                      htmlFor={collection.id}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{collection.name}</div>
                      {collection.tier_id &&
                        collection.tier_id !== tierId && (
                          <div className="text-xs text-muted-foreground">
                            Atualmente em outro nível
                          </div>
                        )}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma coleção disponível
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedCollections.length} coleções selecionadas
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
