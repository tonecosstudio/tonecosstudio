/**
 * Indicador de Tipo de Pedido
 * 
 * Exibe o tipo do pedido (Assinatura, Avulsa ou Pagamento Manual) com ícone e cor
 */

import { Badge } from '@/components/ui/badge';
import { Package, ShoppingCart, CreditCard, FileText } from 'lucide-react';
import { getOrderTypeLabel, getShortOrderTypeLabel } from '@/config/admin-order-status';

interface OrderTypeIndicatorProps {
  type: 'subscription_delivery' | 'standalone_purchase' | 'manual_payment' | 'quote';
  showIcon?: boolean;
  className?: string;
}

export function OrderTypeIndicator({ 
  type, 
  showIcon = true,
  className 
}: OrderTypeIndicatorProps) {
  const getTypeInfo = () => {
    switch (type) {
      case 'subscription_delivery':
        return {
          label: getShortOrderTypeLabel(type),
          icon: Package,
          colorClass: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-50'
        };
      case 'standalone_purchase':
        return {
          label: getShortOrderTypeLabel(type),
          icon: ShoppingCart,
          colorClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50'
        };
      case 'manual_payment':
        return {
          label: getShortOrderTypeLabel(type),
          icon: CreditCard,
          colorClass: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50'
        };
      case 'quote':
        return {
          label: getShortOrderTypeLabel(type),
          icon: FileText,
          colorClass: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50'
        };
    }
  };

  const { label, icon: Icon, colorClass } = getTypeInfo();

  return (
    <Badge 
      variant="outline"
      className={`${colorClass} ${className || ''}`}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}

/**
 * Versão compacta do indicador (apenas ícone)
 */
export function OrderTypeIcon({ type }: { type: 'subscription_delivery' | 'standalone_purchase' | 'manual_payment' | 'quote' }) {
  const getTypeInfo = () => {
    switch (type) {
      case 'subscription_delivery':
        return {
          icon: Package,
          colorClass: 'bg-purple-100 text-purple-700',
          title: getOrderTypeLabel(type)
        };
      case 'standalone_purchase':
        return {
          icon: ShoppingCart,
          colorClass: 'bg-blue-100 text-blue-700',
          title: getOrderTypeLabel(type)
        };
      case 'manual_payment':
        return {
          icon: CreditCard,
          colorClass: 'bg-green-100 text-green-700',
          title: getOrderTypeLabel(type)
        };
      case 'quote':
        return {
          icon: FileText,
          colorClass: 'bg-orange-100 text-orange-700',
          title: getOrderTypeLabel(type)
        };
    }
  };

  const { icon: Icon, colorClass, title } = getTypeInfo();

  return (
    <div 
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${colorClass}`}
      title={title}
    >
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}

/**
 * Hook para obter informações de tipo
 */
export function useTypeInfo(type: 'subscription_delivery' | 'standalone_purchase' | 'manual_payment' | 'quote') {
  switch (type) {
    case 'subscription_delivery':
      return {
        label: getShortOrderTypeLabel(type),
        fullLabel: getOrderTypeLabel(type),
        icon: Package,
        colorClass: 'bg-purple-50 text-purple-700 border-purple-200'
      };
    case 'standalone_purchase':
      return {
        label: getShortOrderTypeLabel(type),
        fullLabel: getOrderTypeLabel(type),
        icon: ShoppingCart,
        colorClass: 'bg-blue-50 text-blue-700 border-blue-200'
      };
    case 'manual_payment':
      return {
        label: getShortOrderTypeLabel(type),
        fullLabel: getOrderTypeLabel(type),
        icon: CreditCard,
        colorClass: 'bg-green-50 text-green-700 border-green-200'
      };
    case 'quote':
      return {
        label: getShortOrderTypeLabel(type),
        fullLabel: getOrderTypeLabel(type),
        icon: FileText,
        colorClass: 'bg-orange-50 text-orange-700 border-orange-200'
      };
  }
}
