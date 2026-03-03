/**
 * BulkProgressModal Component
 * 
 * Displays progress during bulk operations with success/error counts.
 * Shows a progress bar and detailed results.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface BulkProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  isComplete: boolean;
  errors?: string[];
}

export function BulkProgressModal({
  open,
  onOpenChange,
  title,
  total,
  processed,
  successful,
  failed,
  isComplete,
  errors = []
}: BulkProgressModalProps) {
  const progress = total > 0 ? (processed / total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="bulk-progress-description">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription id="bulk-progress-description">
            {isComplete
              ? 'Operação concluída'
              : `Processando ${processed} de ${total} itens...`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{processed} / {total}</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <div className="text-sm font-medium">Sucesso</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {successful}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <div className="text-sm font-medium">Falhas</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {failed}
                </div>
              </div>
            </div>
          </div>

          {/* Processing Indicator */}
          {!isComplete && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processando...</span>
            </div>
          )}

          {/* Error Messages */}
          {isComplete && errors.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-red-600 dark:text-red-400">
                Erros encontrados:
              </div>
              <div className="max-h-[150px] overflow-y-auto space-y-1 text-sm text-muted-foreground">
                {errors.map((error, index) => (
                  <div key={index} className="p-2 rounded bg-red-50 dark:bg-red-950">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            disabled={!isComplete}
          >
            {isComplete ? 'Fechar' : 'Aguarde...'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
