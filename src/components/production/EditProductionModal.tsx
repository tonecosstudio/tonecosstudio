import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { ProductionQueueItem } from "@/types/production";
import { useUpdateProductionNotes } from "@/hooks/admin/useProductionActions";

interface EditProductionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProductionQueueItem;
  onSuccess?: () => void;
}

export function EditProductionModal({
  isOpen,
  onOpenChange,
  item,
  onSuccess,
}: EditProductionModalProps) {
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const updateMutation = useUpdateProductionNotes(item.id);

  useEffect(() => {
    if (isOpen && item) {
      setNotes(item.productionNotes || "");
    }
  }, [isOpen, item]);

  const handleSave = () => {
    updateMutation.mutate(notes.trim() || null, {
      onSuccess: () => {
        toast({
          title: "Item atualizado",
          description: "As alteracoes foram salvas com sucesso.",
        });
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (error: Error) => {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Item de Producao</DialogTitle>
          <DialogDescription>Atualize as informacoes do item de producao</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notas de Producao</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observacoes sobre este item..."
              rows={5}
              disabled={updateMutation.isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alteracoes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
