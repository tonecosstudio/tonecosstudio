// @ts-nocheck
/**
 * Componente de Histórico de Status do Pedido
 * 
 * Exibe uma timeline de todas as mudanças de status de um pedido
 */

import { useQuery } from '@tanstack/react-query';
import { Clock, User, ArrowRight } from 'lucide-react';
import { fetchOrderStatusHistory } from '@/services/admin/orders-service';
import { OrderStatusBadge } from './OrderStatusBadge';
import type { StatusHistoryEntry } from '@/types/admin/orders';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OrderStatusHistoryProps {
  orderId: string;
  orderType: 'subscription_delivery' | 'standalone_purchase' | 'manual_payment';
}

export function OrderStatusHistory({ orderId, orderType }: OrderStatusHistoryProps) {
  const { data: history, isLoading, error } = useQuery({
    queryKey: ['order-status-history', orderId, orderType],
    queryFn: () => fetchOrderStatusHistory(orderId, orderType),
    staleTime: 30000, // 30 segundos
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Histórico de Status
          </h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Histórico de Status
          </h3>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar histórico de status. Tente novamente.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Histórico de Status
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Nenhuma mudança de status registrada
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">
          Histórico de Status
        </h3>
      </div>

      {/* Timeline */}
      <div className="relative space-y-4">
        {/* Linha vertical da timeline */}
        <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

        {history.map((entry, index) => (
          <StatusHistoryItem
            key={entry.id}
            entry={entry}
            isFirst={index === 0}
            isLast={index === history.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

interface StatusHistoryItemProps {
  entry: StatusHistoryEntry;
  isFirst: boolean;
  isLast: boolean;
}

function StatusHistoryItem({ entry, isFirst, isLast }: StatusHistoryItemProps) {
  const formattedDate = new Date(entry.changedAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="relative flex gap-3 pl-0">
      {/* Ícone da timeline */}
      <div className={`
        relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background
        ${isFirst ? 'border-primary' : 'border-border'}
      `}>
        <Clock className={`h-4 w-4 ${isFirst ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 pb-4">
        {/* Status change */}
        <div className="flex items-center gap-2 mb-1">
          {entry.oldStatus ? (
            <>
              <OrderStatusBadge status={entry.oldStatus} />
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <OrderStatusBadge status={entry.newStatus} />
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">Status inicial:</span>
              <OrderStatusBadge status={entry.newStatus} />
            </>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{entry.changedByName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Notes (if any) */}
        {entry.notes && (
          <p className="mt-2 text-sm text-muted-foreground italic">
            {entry.notes}
          </p>
        )}
      </div>
    </div>
  );
}
