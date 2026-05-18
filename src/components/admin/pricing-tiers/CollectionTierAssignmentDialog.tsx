/**
 * CollectionTierAssignmentDialog - Dialog para atribuir coleções a um nível
 */

import { useEffect, useState } from "react";
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
import { Loader2 } from "lucide-react";
import {
  useCollectionsForTierAssignment,
  useSaveCollectionsForTierAssignment,
} from "@/hooks/admin/useCollectionTierAssignmentDialog";

interface CollectionTierAssignmentDialogProps {
  tierId: string;
  tierName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CollectionTierAssignmentDialog({
  tierId,
  tierName,
  open,
  onOpenChange,
  onSuccess,
}: CollectionTierAssignmentDialogProps) {
  const { toast } = useToast();
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const saveMutation = useSaveCollectionsForTierAssignment(tierId);
  const isSaving = saveMutation.isPending;

  const { data: collections, isLoading } = useCollectionsForTierAssignment(open, tierId);

  useEffect(() => {
    if (collections && open) {
      const assigned = collections.filter((c) => c.tier_id === tierId).map((c) => c.id);
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
    try {
      await saveMutation.mutateAsync(selectedCollections);

      toast({
        title: "Coleções atualizadas",
        description: `${selectedCollections.length} coleções atribuídas ao nível ${tierName}`,
      });

      onSuccess?.();
    } catch (error) {
      console.error("Erro ao atribuir coleções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atribuir as coleções",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
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
                    className="flex cursor-pointer items-center space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <Checkbox
                      id={collection.id}
                      checked={selectedCollections.includes(collection.id)}
                      onCheckedChange={() => handleToggle(collection.id)}
                    />
                    <Label htmlFor={collection.id} className="flex-1 cursor-pointer">
                      <div className="font-medium">{collection.name}</div>
                      {collection.tier_id && collection.tier_id !== tierId && (
                        <div className="text-xs text-muted-foreground">Atualmente em outro nível</div>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">Nenhuma coleção disponível</div>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {selectedCollections.length} coleções selecionadas
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
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
