/**
 * Hook para Contagens de Pedidos por Tipo
 * 
 * Busca contagens de cada tipo de pedido para exibir nos filtros
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrdersCounts {
  all: number;
  subscription_delivery: number;
  standalone_purchase: number;
  manual_payment: number;
  quote: number;
}

async function fetchOrdersCounts(): Promise<OrdersCounts> {
  // Buscar contagens em paralelo
  // IMPORTANTE: Contar assinaturas, não entregas individuais
  const [subscriptions, purchases, payments, quotes] = await Promise.all([
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }),
    supabase.from('standalone_purchases').select('id', { count: 'exact', head: true }),
    supabase.from('manual_payments').select('id', { count: 'exact', head: true }),
    supabase.from('quotes').select('id', { count: 'exact', head: true }),
  ]);

  const subscriptionsCount = subscriptions.count || 0;
  const purchasesCount = purchases.count || 0;
  const paymentsCount = payments.count || 0;
  const quotesCount = quotes.count || 0;

  return {
    all: subscriptionsCount + purchasesCount + paymentsCount + quotesCount,
    subscription_delivery: subscriptionsCount,
    standalone_purchase: purchasesCount,
    manual_payment: paymentsCount,
    quote: quotesCount,
  };
}

export function useOrdersCounts() {
  return useQuery({
    queryKey: ['admin-orders-counts'],
    queryFn: fetchOrdersCounts,
    staleTime: 60000, // 1 minuto
    gcTime: 300000, // 5 minutos
  });
}
