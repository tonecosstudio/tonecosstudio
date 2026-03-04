// @ts-nocheck
/**
 * Modal de Resultado de Geração de Etiquetas em Massa
 * 
 * Exibe o resultado detalhado da geração de etiquetas em massa, incluindo:
 * - Contagem de sucessos e falhas
 * - Lista de pedidos com endereços inválidos
 * - Botão para abrir todas as etiquetas geradas
 * - Detalhes dos erros por pedido
 * 
 * Requisitos: 8.2, 8.4
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
  ExternalLink,
  Download,
  RefreshCw,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BulkLabelGenerationResult } from '@/types/admin/orders';
import { 
  openLabelsInTabs, 
  LabelErrorCode
} from '@/services/admin/label-service';

interface BulkLabelGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: BulkLabelGenerationResult | null;
  onClose: () => void;
  onRetry?: (orderIds: string[]) => void;
  onEditAddress?: (orderId: string) => void;
}

export function BulkLabelGenerationModal({
  open,
  onOpenChange,
  result,
  onClose,
  onRetry,
  onEditAddress
}: BulkLabelGenerationModalProps) {
  if (!result) return null;

  const hasFailures = result.failureCount > 0;
  const hasSuccesses = result.successCount > 0;

  // Categorizar falhas por tipo de erro
  const addressErrors = result.failed.filter(f => 
    f.errorCode === LabelErrorCode.ADDRESS_NOT_FOUND || 
    f.errorCode === LabelErrorCode.INVALID_ADDRESS
  );
  
  const retryableErrors = result.failed.filter(f => 
    f.errorCode === LabelErrorCode.API_ERROR ||
    f.errorCode === LabelErrorCode.NETWORK_ERROR ||
    f.errorCode === LabelErrorCode.TIMEOUT_ERROR ||
    f.errorCode === LabelErrorCode.GENERATION_FAILED
  );
  
  const otherErrors = result.failed.filter(f => 
    !addressErrors.includes(f) && !retryableErrors.includes(f)
  );

  const handleOpenLabels = () => {
    if (result.successful.length > 0) {
      openLabelsInTabs(result.successful);
    }
  };

  const handleRetryFailed = () => {
    if (onRetry && retryableErrors.length > 0) {
      const orderIds = retryableErrors.map(f => f.orderId);
      onRetry(orderIds);
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
                Etiquetas Geradas com Sucesso
              </>
            )}
            {hasFailures && hasSuccesses && (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Geração Concluída com Avisos
              </>
            )}
            {hasFailures && !hasSuccesses && (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                Falha na Geração de Etiquetas
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Resultado da geração de etiquetas em massa para {result.total} {result.total === 1 ? 'pedido' : 'pedidos'}
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
              <span className="text-sm font-medium">Etiquetas Geradas</span>
            </div>
            <p className={cn(
              'text-2xl font-bold',
              hasSuccesses ? 'text-green-600' : 'text-muted-foreground'
            )}>
              {result.successCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {result.successCount === 1 ? 'etiqueta gerada' : 'etiquetas geradas'}
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
              {result.failureCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {result.failureCount === 1 ? 'pedido falhou' : 'pedidos falharam'}
            </p>
          </div>
        </div>

        {/* Botão para abrir etiquetas */}
        {hasSuccesses && (
          <Alert>
            <Download className="h-4 w-4 text-green-600" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {result.successCount} {result.successCount === 1 ? 'etiqueta pronta' : 'etiquetas prontas'} para download
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenLabels}
                className="gap-2"
              >
                <ExternalLink className="h-3 w-3" />
                Abrir Todas as Etiquetas
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Lista de falhas detalhada */}
        {hasFailures && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Pedidos com problemas ({result.failureCount}):
            </h4>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Os pedidos abaixo não puderam ter etiquetas geradas. Verifique os detalhes e tome as ações necessárias.
              </AlertDescription>
            </Alert>

            {/* Erros de endereço - com opção de corrigir */}
            {addressErrors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium text-red-900">
                    Problemas de Endereço ({addressErrors.length})
                  </h5>
                  {onEditAddress && (
                    <span className="text-xs text-muted-foreground">
                      Clique em "Corrigir" para editar o endereço
                    </span>
                  )}
                </div>
                <ScrollArea className="h-[150px] rounded-md border">
                  <div className="p-4 space-y-2">
                    {addressErrors.map((failure, index) => (
                      <div
                        key={`${failure.orderId}-${index}`}
                        className="flex items-start gap-3 p-3 rounded-md bg-red-50 border border-red-200"
                      >
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-red-900">
                              {failure.customerName}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground">
                              {failure.orderId.slice(0, 8)}
                            </span>
                          </div>
                          <p className="text-sm text-red-800">
                            {failure.error}
                          </p>
                        </div>
                        {onEditAddress && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEditAddress(failure.orderId)}
                            className="gap-1 flex-shrink-0"
                          >
                            <Edit className="h-3 w-3" />
                            Corrigir
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Erros recuperáveis - com opção de tentar novamente */}
            {retryableErrors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium text-yellow-900">
                    Erros Temporários ({retryableErrors.length})
                  </h5>
                  {onRetry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetryFailed}
                      className="gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Tentar Novamente
                    </Button>
                  )}
                </div>
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    Estes erros são temporários e podem ser resolvidos tentando novamente.
                  </AlertDescription>
                </Alert>
                <ScrollArea className="h-[150px] rounded-md border">
                  <div className="p-4 space-y-2">
                    {retryableErrors.map((failure, index) => (
                      <div
                        key={`${failure.orderId}-${index}`}
                        className="flex items-start gap-3 p-3 rounded-md bg-yellow-50 border border-yellow-200"
                      >
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-yellow-900">
                              {failure.customerName}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground">
                              {failure.orderId.slice(0, 8)}
                            </span>
                          </div>
                          <p className="text-sm text-yellow-800">
                            {failure.error}
                          </p>
                          {failure.errorCode && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Código: {failure.errorCode}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Outros erros */}
            {otherErrors.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-900">
                  Outros Problemas ({otherErrors.length})
                </h5>
                <ScrollArea className="h-[150px] rounded-md border">
                  <div className="p-4 space-y-2">
                    {otherErrors.map((failure, index) => (
                      <div
                        key={`${failure.orderId}-${index}`}
                        className="flex items-start gap-3 p-3 rounded-md bg-gray-50 border border-gray-200"
                      >
                        <XCircle className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {failure.customerName}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground">
                              {failure.orderId.slice(0, 8)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800">
                            {failure.error}
                          </p>
                          {failure.errorCode && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Código: {failure.errorCode}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {/* Mensagem de sucesso total */}
        {!hasFailures && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Todas as {result.total} {result.total === 1 ? 'etiqueta foi gerada' : 'etiquetas foram geradas'} com sucesso!
              Clique no botão acima para abrir todas as etiquetas.
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
