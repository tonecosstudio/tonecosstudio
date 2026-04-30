/**
 * DeactivateCollectionDialog
 *
 * Confirmation dialog for deactivating a collection
 * Shows warning about active deliveries and requires confirmation
 *
 * Requirements: 14.7, 14.8
 * Task: 20.5
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
import { AlertTriangle } from "lucide-react";

interface DeactivateCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionName: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeactivateCollectionDialog({
  open,
  onOpenChange,
  collectionName,
  onConfirm,
  isLoading = false,
}: DeactivateCollectionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Desativar Coleção</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>
              Você está prestes a desativar a coleção <strong>{collectionName}</strong>.
            </p>
            <p>
              Esta ação irá:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Ocultar a coleção de novos clientes</li>
              <li>Impedir novas assinaturas desta coleção</li>
              <li>Manter entregas ativas existentes intactas</li>
            </ul>
            <p className="text-amber-600 font-medium">
              Nota: A desativação será bloqueada se houver entregas ativas pendentes.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? "Desativando..." : "Confirmar Desativação"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
