import { supabase } from '@/integrations/supabase/client';

export interface OrdersCounts {
  all: number;
  subscription_delivery: number;
  standalone_purchase: number;
  manual_payment: number;
  quote: number;
}

export async function fetchOrdersCounts(): Promise<OrdersCounts> {
  const [subscriptionDeliveries, purchases, payments, quotes] = await Promise.all([
    supabase.from('subscription_deliveries').select('id', { count: 'exact', head: true }),
    supabase.from('standalone_purchases').select('id', { count: 'exact', head: true }),
    supabase.from('manual_payments').select('id', { count: 'exact', head: true }),
    supabase.from('quotes').select('id', { count: 'exact', head: true }),
  ]);

  const subscriptionDeliveriesCount = subscriptionDeliveries.count || 0;
  const purchasesCount = purchases.count || 0;
  const paymentsCount = payments.count || 0;
  const quotesCount = quotes.count || 0;

  return {
    all: subscriptionDeliveriesCount + purchasesCount + paymentsCount + quotesCount,
    subscription_delivery: subscriptionDeliveriesCount,
    standalone_purchase: purchasesCount,
    manual_payment: paymentsCount,
    quote: quotesCount,
  };
}
