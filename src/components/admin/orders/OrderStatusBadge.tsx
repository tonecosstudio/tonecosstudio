/**
 * Badge de Status de Pedido
 * 
 * Exibe o status do pedido com cores apropriadas
 */

import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/types/admin/orders';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

/**
 * Mapeamento de status para labels em português
 */
const STATUS_LABELS: Record<OrderStatus, string> = {
  // Entregas de assinatura
  scheduled: 'Agendada',
  pending_choice: 'Aguardando Escolha',
  confirmed: 'Confirmada',
  in_production: 'Em Produção',
  shipped: 'Enviada',
  delivered: 'Entregue',
  revealed: 'Revelada',
  
  // Compras avulsas
  awaiting_deposit: 'Aguardando Depósito',
  deposit_paid: 'Depósito Pago',
  awaiting_balance: 'Aguardando Saldo',
  balance_paid: 'Saldo Pago',
  completed: 'Completa',
  
  // Pagamentos manuais
  pending: 'Pendente',
  under_review: 'Em Análise',
  requires_info: 'Requer Informações',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  
  // Orçamentos
  reviewing: 'Em Análise',
  answered: 'Respondido',
  archived: 'Arquivado',
  
  // Comum
  cancelled: 'Cancelada'
};

/**
 * Mapeamento de status para variantes de cor
 */
const STATUS_VARIANTS: Record<OrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  // Entregas de assinatura
  scheduled: 'outline',
  pending_choice: 'secondary',
  confirmed: 'default',
  in_production: 'default',
  shipped: 'default',
  delivered: 'default',
  revealed: 'default',
  
  // Compras avulsas
  awaiting_deposit: 'secondary',
  deposit_paid: 'default',
  awaiting_balance: 'secondary',
  balance_paid: 'default',
  completed: 'default',
  
  // Pagamentos manuais
  pending: 'secondary',
  under_review: 'default',
  requires_info: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  
  // Orçamentos
  reviewing: 'default',
  answered: 'default',
  archived: 'outline',
  
  // Comum
  cancelled: 'destructive'
};

/**
 * Mapeamento de status para classes de cor customizadas
 */
const STATUS_COLORS: Record<OrderStatus, string> = {
  // Entregas de assinatura
  scheduled: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  pending_choice: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
  confirmed: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  in_production: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  shipped: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100',
  delivered: 'bg-green-100 text-green-700 hover:bg-green-100',
  revealed: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  
  // Compras avulsas
  awaiting_deposit: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  deposit_paid: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-100',
  awaiting_balance: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  balance_paid: 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  completed: 'bg-green-100 text-green-700 hover:bg-green-100',
  
  // Pagamentos manuais
  pending: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  under_review: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  requires_info: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
  approved: 'bg-green-100 text-green-700 hover:bg-green-100',
  rejected: 'bg-red-100 text-red-700 hover:bg-red-100',
  
  // Orçamentos
  reviewing: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  answered: 'bg-green-100 text-green-700 hover:bg-green-100',
  archived: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  
  // Comum
  cancelled: 'bg-red-100 text-red-700 hover:bg-red-100'
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const label = STATUS_LABELS[status] || status;
  const colorClass = STATUS_COLORS[status];

  return (
    <Badge 
      variant="outline" 
      className={`${colorClass} ${className || ''}`}
    >
      {label}
    </Badge>
  );
}

/**
 * Hook para obter informações de status
 */
export function useStatusInfo(status: OrderStatus) {
  return {
    label: STATUS_LABELS[status] || status,
    variant: STATUS_VARIANTS[status] || 'default',
    colorClass: STATUS_COLORS[status]
  };
}
