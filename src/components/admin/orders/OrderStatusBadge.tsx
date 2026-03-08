/**
 * Badge de Status de Pedido
 * 
 * Exibe o status do pedido com cores apropriadas e ícones
 */

import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/types/admin/orders';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Package, 
  Truck, 
  Home,
  Eye,
  DollarSign,
  FileText,
  XCircle,
  Loader2
} from 'lucide-react';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
  showIcon?: boolean;
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
 * Mapeamento de status para ícones
 */
const STATUS_ICONS: Record<OrderStatus, React.ComponentType<{ className?: string }>> = {
  scheduled: Clock,
  pending_choice: AlertCircle,
  confirmed: CheckCircle,
  in_production: Package,
  shipped: Truck,
  delivered: Home,
  revealed: Eye,
  awaiting_deposit: DollarSign,
  deposit_paid: CheckCircle,
  awaiting_balance: DollarSign,
  balance_paid: CheckCircle,
  completed: CheckCircle,
  pending: Clock,
  under_review: Loader2,
  requires_info: AlertCircle,
  approved: CheckCircle,
  rejected: XCircle,
  reviewing: Loader2,
  answered: CheckCircle,
  archived: FileText,
  cancelled: XCircle
};

/**
 * Mapeamento de status para classes de cor customizadas
 */
const STATUS_COLORS: Record<OrderStatus, string> = {
  // Entregas de assinatura
  scheduled: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
  pending_choice: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
  in_production: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200',
  shipped: 'bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200',
  delivered: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
  revealed: 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200',
  
  // Compras avulsas
  awaiting_deposit: 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200',
  deposit_paid: 'bg-cyan-100 text-cyan-800 border-cyan-300 hover:bg-cyan-200',
  awaiting_balance: 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200',
  balance_paid: 'bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-200',
  completed: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
  
  // Pagamentos manuais
  pending: 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200',
  under_review: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
  requires_info: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200',
  
  // Orçamentos
  reviewing: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
  answered: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
  archived: 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200',
  
  // Comum
  cancelled: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
};

export function OrderStatusBadge({ status, className, showIcon = true }: OrderStatusBadgeProps) {
  const label = STATUS_LABELS[status] || status;
  const colorClass = STATUS_COLORS[status];
  const Icon = STATUS_ICONS[status];

  return (
    <Badge 
      variant="outline" 
      className={`${colorClass} font-medium ${className || ''}`}
    >
      {showIcon && Icon && <Icon className="h-3 w-3 mr-1" />}
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
    colorClass: STATUS_COLORS[status],
    Icon: STATUS_ICONS[status]
  };
}
