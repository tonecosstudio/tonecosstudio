/**
 * EditProductionModal Component
 * 
 * Modal for editing production queue items
 */

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { supabase } from "@/integrations/supabase/client";
import type { ProductionQueueItem } from "@/services/admin/production-service";

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
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen && item) {
      setNotes(item.productionNotes || "");
    }
  }, [isOpen, item]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("production_queue")
        .update({
          production_notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-queue"] });
      toast({
        title: "Item atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Item de Produção</DialogTitle>
          <DialogDescription>
            Atualize as informações do item de produção
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notas de Produção</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre este item..."
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
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
