// @ts-nocheck
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StandalonePurchase } from "@/types/database";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CheckCircle, 
  Clock, 
  CreditCard, 
  Package, 
  Truck, 
  XCircle,
  AlertCircle
} from "lucide-react";
import { toBahiaTime } from "@/lib/timezone";

interface StandalonePurchaseStatusProps {
  purchase: StandalonePurchase;
}

/**
 * Component to display standalone purchase status with badges, specific information, and timeline
 * 
 * Shows:
 * - Status badge with color coding
 * - Status-specific information (due dates, tracking, etc.)
 * - Timeline of status transitions
 * 
 * @param purchase - The standalone purchase object
 */
export function StandalonePurchaseStatus({ purchase }: StandalonePurchaseStatusProps) {
  // Get status badge configuration
  const getStatusBadge = (status: StandalonePurchase['status']) => {
    switch (status) {
      case 'deposit_paid':
        return {
          label: 'Depósito Pago',
          variant: 'default' as const,
          className: 'bg-blue-500',
        };
      case 'awaiting_balance':
        return {
          label: 'Aguardando Saldo',
          variant: 'default' as const,
          className: 'bg-amber-500',
        };
      case 'balance_paid':
        return {
          label: 'Saldo Pago',
          variant: 'default' as const,
          className: 'bg-green-500',
        };
      case 'shipped':
        return {
          label: 'Enviado',
          variant: 'default' as const,
          className: 'bg-purple-500',
        };
      case 'delivered':
        return {
          label: 'Entregue',
          variant: 'outline' as const,
          className: 'border-green-500 text-green-500',
        };
      case 'cancelled':
        return {
          label: 'Cancelado',
          variant: 'destructive' as const,
          className: '',
        };
      default:
        return {
          label: status,
          variant: 'secondary' as const,
          className: '',
        };
    }
  };

  const statusConfig = getStatusBadge(purchase.status);

  // Format dates in Bahia timezone
  const formatDate = (date: Date | null) => {
    if (!date) return null;
    const bahiaDate = toBahiaTime(date);
    return format(bahiaDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatDateOnly = (date: Date | null) => {
    if (!date) return null;
    const bahiaDate = toBahiaTime(date);
    return format(bahiaDate, "dd/MM/yyyy", { locale: ptBR });
  };

  // Build timeline based on status transitions
  const timeline = [
    {
      phase: 'Depósito',
      icon: CreditCard,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      completed: !!purchase.deposit_paid_at,
      date: purchase.deposit_paid_at,
      description: `R$ ${purchase.deposit_amount.toFixed(2)} pago`,
    },
    {
      phase: 'Produção',
      icon: Package,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      completed: !!purchase.production_complete_at,
      date: purchase.production_complete_at,
      description: purchase.production_complete_at ? 'Produção concluída' : 'Em produção',
    },
    {
      phase: 'Pagamento Saldo',
      icon: CreditCard,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      completed: !!purchase.balance_paid_at,
      date: purchase.balance_paid_at,
      description: purchase.balance_paid_at 
        ? `R$ ${purchase.balance_amount.toFixed(2)} pago`
        : purchase.balance_due_date
        ? `Vence em ${formatDateOnly(purchase.balance_due_date)}`
        : 'Aguardando produção',
    },
    {
      phase: 'Envio',
      icon: Truck,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      completed: !!purchase.shipped_at,
      date: purchase.shipped_at,
      description: purchase.tracking_code 
        ? `Código: ${purchase.tracking_code}`
        : purchase.shipped_at
        ? 'Enviado'
        : 'Aguardando envio',
    },
    {
      phase: 'Entrega',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-600/10',
      completed: !!purchase.delivered_at,
      date: purchase.delivered_at,
      description: purchase.delivered_at ? 'Entregue' : 'Aguardando entrega',
    },
  ];

  // Filter timeline if cancelled
  const displayTimeline = purchase.status === 'cancelled' 
    ? timeline.filter(item => item.completed)
    : timeline;

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
        <Badge variant={statusConfig.variant} className={statusConfig.className}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Status-specific Information */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          {/* Deposit Information */}
          {purchase.deposit_paid_at && (
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Depósito Confirmado</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(purchase.deposit_paid_at)}
                </p>
              </div>
            </div>
          )}

          {/* Production Complete */}
          {purchase.production_complete_at && (
            <div className="flex items-start gap-2">
              <Package className="h-4 w-4 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Produção Concluída</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(purchase.production_complete_at)}
                </p>
              </div>
            </div>
          )}

          {/* Balance Due Date */}
          {purchase.status === 'awaiting_balance' && purchase.balance_due_date && (
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Prazo para Pagamento do Saldo</p>
                <p className="text-xs text-muted-foreground">
                  Vencimento: {formatDateOnly(purchase.balance_due_date)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Valor: R$ {purchase.balance_amount.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Balance Paid */}
          {purchase.balance_paid_at && (
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Saldo Confirmado</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(purchase.balance_paid_at)}
                </p>
              </div>
            </div>
          )}

          {/* Tracking Information */}
          {purchase.tracking_code && (
            <div className="flex items-start gap-2">
              <Truck className="h-4 w-4 text-purple-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Código de Rastreamento</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {purchase.tracking_code}
                </p>
                {purchase.shipped_at && (
                  <p className="text-xs text-muted-foreground">
                    Enviado em: {formatDate(purchase.shipped_at)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Delivered */}
          {purchase.delivered_at && (
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Pedido Entregue</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(purchase.delivered_at)}
                </p>
              </div>
            </div>
          )}

          {/* Cancellation Information */}
          {purchase.status === 'cancelled' && (
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Pedido Cancelado</p>
                {purchase.cancelled_at && (
                  <p className="text-xs text-muted-foreground">
                    {formatDate(purchase.cancelled_at)}
                  </p>
                )}
                {purchase.cancellation_reason && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Motivo: {purchase.cancellation_reason}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <div>
        <h4 className="text-sm font-medium mb-3">Linha do Tempo</h4>
        <div className="space-y-3">
          {displayTimeline.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === displayTimeline.length - 1;

            return (
              <div key={index} className="relative flex items-start gap-3">
                {/* Connector Line */}
                {!isLast && (
                  <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />
                )}

                {/* Icon */}
                <div
                  className={`relative z-10 w-8 h-8 rounded-full ${
                    item.completed ? item.bgColor : 'bg-muted'
                  } flex items-center justify-center flex-shrink-0`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      item.completed ? item.color : 'text-muted-foreground'
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-medium ${
                        item.completed ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {item.phase}
                    </p>
                    {item.completed && (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    )}
                    {!item.completed && purchase.status !== 'cancelled' && (
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                  {item.date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(item.date)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
