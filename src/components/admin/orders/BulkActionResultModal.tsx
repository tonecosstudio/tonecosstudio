/**
 * Modal de Resultado de Ação em Massa
 * 
 * Exibe o resultado detalhado de uma ação em massa, incluindo:
 * - Contagem de sucessos e falhas
 * - Lista de pedidos que falharam com motivo do erro
 * - Opção de retry para pedidos que falharam
 * 
 * Requisitos: 7.5, 15.3
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BulkActionResult } from '@/types/admin/orders';

interface BulkActionResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: BulkActionResult | null;
  actionDescription: string;
  onRetry?: (failedIds: string[]) => void;
  onClose: () => void;
}

export function BulkActionResultModal({
  open,
  onOpenChange,
  result,
  actionDescription,
  onRetry,
  onClose
}: BulkActionResultModalProps) {
  if (!result) return null;

  const hasFailures = result.failed.length > 0;
  const hasSuccesses = result.successful.length > 0;
  const totalProcessed = result.successful.length + result.failed.length;

  const handleRetry = () => {
    if (onRetry && result.failed.length > 0) {
      const failedIds = result.failed.map(f => f.id);
      onRetry(failedIds);
    }
  };

  const handleClose = () => {
    onClose();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!hasFailures && (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Ação Concluída com Sucesso
              </>
            )}
            {hasFailures && hasSuccesses && (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Ação Concluída com Avisos
              </>
            )}
            {hasFailures && !hasSuccesses && (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                Ação Falhou
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {actionDescription}
          </DialogDescription>
        </DialogHeader>

        {/* Resumo de resultados */}
        <div className="grid grid-cols-2 gap-4">
          {/* Sucessos */}
          <div className={cn(
            'rounded-lg border p-4',
            hasSuccesses ? 'bg-green-50 border-green-200' : 'bg-muted'
          )}>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className={cn(
                'h-4 w-4',
                hasSuccesses ? 'text-green-600' : 'text-muted-foreground'
              )} />
              <span className="text-sm font-medium">Sucessos</span>
            </div>
            <p className={cn(
              'text-2xl font-bold',
              hasSuccesses ? 'text-green-600' : 'text-muted-foreground'
            )}>
              {result.successful.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {result.successful.length === 1 ? 'pedido atualizado' : 'pedidos atualizados'}
            </p>
          </div>

          {/* Falhas */}
          <div className={cn(
            'rounded-lg border p-4',
            hasFailures ? 'bg-red-50 border-red-200' : 'bg-muted'
          )}>
            <div className="flex items-center gap-2 mb-1">
              <XCircle className={cn(
                'h-4 w-4',
                hasFailures ? 'text-red-600' : 'text-muted-foreground'
              )} />
              <span className="text-sm font-medium">Falhas</span>
            </div>
            <p className={cn(
              'text-2xl font-bold',
              hasFailures ? 'text-red-600' : 'text-muted-foreground'
            )}>
              {result.failed.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {result.failed.length === 1 ? 'pedido falhou' : 'pedidos falharam'}
            </p>
          </div>
        </div>

        {/* Lista de falhas detalhada */}
        {hasFailures && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Pedidos que falharam ({result.failed.length}):
              </h4>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="gap-2"
                >
                  <RefreshCw className="h-3 w-3" />
                  Tentar Novamente
                </Button>
              )}
            </div>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Os pedidos abaixo não puderam ser processados. Verifique os erros e tente novamente.
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-[250px] rounded-md border">
              <div className="p-4 space-y-2">
                {result.failed.map((failure, index) => (
                  <div
                    key={`${failure.id}-${index}`}
                    className="flex items-start gap-3 p-3 rounded-md bg-red-50 border border-red-200"
                  >
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          {failure.id.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-sm text-red-900 font-medium">
                        {failure.error}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Mensagem de sucesso total */}
        {!hasFailures && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Todos os {totalProcessed} {totalProcessed === 1 ? 'pedido foi processado' : 'pedidos foram processados'} com sucesso!
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button onClick={handleClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
