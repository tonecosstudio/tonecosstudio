/**
 * Collection Change Confirmation Dialog
 * 
 * Shows confirmation dialog before changing collection with:
 * - Previous and new collection
 * - Warning if close to cutoff
 * - Confirm and Cancel buttons
 * 
 * Requirements: 28.6
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ArrowRight } from "lucide-react";

interface CollectionSummary {
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
}

interface CollectionChangeConfirmationProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  previousCollection?: CollectionSummary | null;
  newCollection: CollectionSummary;
  isCloseToCutoff?: boolean;
  timeUntilCutoff?: string;
}

export function CollectionChangeConfirmation({
  isOpen,
  onOpenChange,
  onConfirm,
  previousCollection,
  newCollection,
  isCloseToCutoff = false,
  timeUntilCutoff,
}: CollectionChangeConfirmationProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Troca de Coleção</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a trocar sua coleção. Revise as informações abaixo antes de confirmar.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning if close to cutoff */}
          {isCloseToCutoff && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção!</strong> Faltam apenas <strong>{timeUntilCutoff}</strong> para o prazo final.
                Certifique-se de que esta é a coleção que você deseja receber.
              </AlertDescription>
            </Alert>
          )}

          {/* Collection Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
            {/* Previous Collection */}
            <div className="p-4 rounded-lg border bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2">Coleção Atual</p>
              <div className="space-y-2">
                {previousCollection?.image_url && (
                  <img
                    src={previousCollection.image_url}
                    alt={previousCollection.name ?? "Coleção atual"}
                    className="w-full h-32 object-cover rounded"
                  />
                )}
                <h4 className="font-semibold">{previousCollection?.name || 'Nenhuma'}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {previousCollection?.description}
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-muted-foreground" />
            </div>

            {/* New Collection */}
            <div className="p-4 rounded-lg border bg-primary/5 border-primary">
              <p className="text-xs text-primary mb-2 font-medium">Nova Coleção</p>
              <div className="space-y-2">
                {newCollection?.image_url && (
                  <img
                    src={newCollection.image_url}
                    alt={newCollection.name ?? "Nova coleção"}
                    className="w-full h-32 object-cover rounded"
                  />
                )}
                <h4 className="font-semibold">{newCollection?.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {newCollection.description}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <Alert>
            <AlertDescription>
              Esta troca será aplicada na sua próxima entrega. Você pode trocar quantas vezes quiser até o início da produção (dia 15 às 23:59).
            </AlertDescription>
          </Alert>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Confirmar Troca
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
