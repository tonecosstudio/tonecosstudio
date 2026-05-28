/**
 * Componente de Detalhes de Orçamento
 * 
 * Exibe informações detalhadas de um orçamento no painel lateral
 * Alinhado com a estrutura real da tabela quotes + quote_items
 */

import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Package, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { OrderStatus, UnifiedOrder } from '@/types/admin/orders';
import { useUpdateOrderStatus } from '@/hooks/admin/useOrderMutations';
import { formatCurrency } from '@/lib/utils';
import { getOrderStatusLabel } from '@/config/admin-order-status';

interface QuoteDetailsProps {
  order: UnifiedOrder;
}

export function QuoteDetails({ order }: QuoteDetailsProps) {
  const { toast } = useToast();
  const updateStatusMutation = useUpdateOrderStatus();

  if (order.type !== 'quote' || !order.quote) {
    return null;
  }

  const quoteData = order.quote;

  const handleUpdateStatus = async (newStatus: string) => {
    const status = newStatus as OrderStatus;
    try {
      await updateStatusMutation.mutateAsync({
        orderId: order.id,
        orderType: 'quote',
        newStatus: status
      });

      toast({
        title: '✓ Status atualizado',
        description: `Orçamento marcado como ${getOrderStatusLabel(newStatus)}.`,
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: '✗ Erro ao atualizar',
        description: error instanceof Error ? error.message : 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Detalhes do Orçamento
        </h3>
        
        <div className="space-y-3">
          {/* Valor Total */}
          {quoteData.totalAmount != null && quoteData.totalAmount > 0 && (
            <div className="flex items-center justify-between pt-1 pb-1 border-b">
              <span className="text-sm font-medium">Valor Total</span>
              <span className="text-lg font-semibold">
                {formatCurrency(quoteData.totalAmount)}
              </span>
            </div>
          )}

          {/* Observações */}
          {quoteData.notes && (
            <div className="p-3 bg-muted rounded-md">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {quoteData.notes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Separator />

      {/* Itens do Orçamento */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Itens Solicitados ({quoteData.items.length})
          </h3>
        </div>

        {quoteData.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum item no orçamento
          </p>
        ) : (
          <div className="space-y-2">
            {quoteData.items.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-muted rounded-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium">{item.quantity}x</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.unitPrice)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-xs font-medium mt-0.5">
                        {formatCurrency(item.totalPrice)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Ações de Admin */}
      {order.status !== 'answered' && order.status !== 'archived' && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Ações
          </h3>
          
          <div className="space-y-2">
            {order.status === 'pending' && (
              <Button
                variant="default"
                className="w-full"
                onClick={() => handleUpdateStatus('reviewing')}
                disabled={updateStatusMutation.isPending}
              >
                Marcar como Em Análise
              </Button>
            )}

            {(order.status === 'pending' || order.status === 'reviewing') && (
              <Button
                variant="default"
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => handleUpdateStatus('answered')}
                disabled={updateStatusMutation.isPending}
              >
                Marcar como Respondido
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleUpdateStatus('archived')}
              disabled={updateStatusMutation.isPending}
            >
              Arquivar
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
