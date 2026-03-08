/**
 * Filtro de Tipo de Pedido - Visual e Destacado
 * 
 * Componente tipo "tabs" para filtrar entre tipos de pedidos
 */

import { Package, ShoppingCart, CreditCard, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OrderTypeFilterProps {
  selectedType: 'all' | 'subscription_delivery' | 'standalone_purchase' | 'manual_payment' | 'quote';
  onTypeChange: (type: 'all' | 'subscription_delivery' | 'standalone_purchase' | 'manual_payment' | 'quote') => void;
  counts?: {
    all: number;
    subscription_delivery: number;
    standalone_purchase: number;
    manual_payment: number;
    quote: number;
  };
}

export function OrderTypeFilter({ selectedType, onTypeChange, counts }: OrderTypeFilterProps) {
  const types = [
    {
      value: 'all' as const,
      label: 'Todos',
      icon: Package,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      activeBgColor: 'bg-gray-600',
    },
    {
      value: 'subscription_delivery' as const,
      label: 'Assinaturas',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      activeBgColor: 'bg-blue-600',
    },
    {
      value: 'standalone_purchase' as const,
      label: 'Avulsos',
      icon: ShoppingCart,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      activeBgColor: 'bg-green-600',
    },
    {
      value: 'manual_payment' as const,
      label: 'Pagamentos',
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      activeBgColor: 'bg-purple-600',
    },
    {
      value: 'quote' as const,
      label: 'Orçamentos',
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      activeBgColor: 'bg-orange-600',
    },
  ];

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Tipo de Pedido</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {types.map((type) => {
          const Icon = type.icon;
          const isActive = selectedType === type.value;
          const count = counts?.[type.value] ?? 0;

          return (
            <button
              key={type.value}
              onClick={() => onTypeChange(type.value)}
              className={cn(
                'relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all',
                'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2',
                isActive
                  ? `border-${type.color.split('-')[1]}-600 ${type.bgColor} shadow-sm`
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              {/* Ícone */}
              <div
                className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-full mb-2 transition-colors',
                  isActive ? `${type.activeBgColor} text-white` : `${type.bgColor} ${type.color}`
                )}
              >
                <Icon className="w-6 h-6" />
              </div>

              {/* Label */}
              <span
                className={cn(
                  'text-sm font-medium transition-colors',
                  isActive ? type.color : 'text-gray-700'
                )}
              >
                {type.label}
              </span>

              {/* Count Badge */}
              {counts && (
                <span
                  className={cn(
                    'absolute top-2 right-2 px-2 py-0.5 text-xs font-semibold rounded-full',
                    isActive
                      ? `${type.activeBgColor} text-white`
                      : `${type.bgColor} ${type.color}`
                  )}
                >
                  {count}
                </span>
              )}

              {/* Active Indicator */}
              {isActive && (
                <div className={cn('absolute bottom-0 left-0 right-0 h-1 rounded-b-lg', type.activeBgColor)} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
