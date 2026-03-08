/**
 * Estatísticas Rápidas de Pedidos
 * 
 * Mostra cards com estatísticas por tipo
 */

import { Package, ShoppingCart, CreditCard, FileText, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OrdersStatsProps {
  counts?: {
    all: number;
    subscription_delivery: number;
    standalone_purchase: number;
    manual_payment: number;
    quote: number;
  };
  isLoading?: boolean;
}

export function OrdersStats({ counts, isLoading }: OrdersStatsProps) {
  const stats = [
    {
      label: 'Total',
      value: counts?.all ?? 0,
      icon: TrendingUp,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
    {
      label: 'Assinaturas',
      value: counts?.subscription_delivery ?? 0,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Avulsos',
      value: counts?.standalone_purchase ?? 0,
      icon: ShoppingCart,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Pagamentos',
      value: counts?.manual_payment ?? 0,
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      label: 'Orçamentos',
      value: counts?.quote ?? 0,
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">{stat.label}</span>
              <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                <Icon className={cn('w-4 h-4', stat.color)} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString('pt-BR')}</div>
          </div>
        );
      })}
    </div>
  );
}
