import { supabase } from '@/integrations/supabase/client';

export interface DeliveryDetail {
  id: string;
  subscription_id: string;
  cycle_id: string | null;
  collection_id: string | null;
  delivery_number: number;
  status: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  tracking_code: string | null;
  auto_maintained: boolean;
  bonus_piece_id: string | null;
  created_at: string;
  updated_at: string;
  subscriptions: {
    user_id: string;
    collection_id: string;
    plan_type: string;
    status: string;
    total_paid: number;
    payment_method: string;
    collections: {
      name: string;
      price: number;
    };
  } | null;
  cycles: {
    cycle_number: number;
    month: number;
    year: number;
  } | null;
  collections: {
    name: string;
    price: number;
  } | null;
  bonus_pieces: {
    id: string;
    description: string;
    image_url: string | null;
    status: string;
  } | null;
}

export interface CollectionChangeHistory {
  id: string;
  previous_collection_id: string | null;
  new_collection_id: string;
  change_reason: string;
  changed_by_admin: boolean;
  created_at: string;
  previous_collection: {
    name: string;
  } | null;
  new_collection: {
    name: string;
  };
}

interface OrderStatusHistoryRow {
  id: string;
  order_type: string | null;
  changed_by: string | null;
  created_at: string;
  old_status: string | null;
  new_status: string;
}

export async function fetchDeliveryDetail(deliveryId: string): Promise<DeliveryDetail | null> {
  const { data, error } = await supabase
    .from('subscription_deliveries')
    .select(`
      id,
      subscription_id,
      cycle_id,
      collection_id,
      delivery_number,
      status,
      expected_delivery_date,
      actual_delivery_date,
      tracking_code,
      auto_maintained,
      bonus_piece_id,
      created_at,
      updated_at,
      subscriptions (
        user_id,
        collection_id,
        plan_type,
        status,
        total_paid,
        payment_method,
        collections (
          name,
          price
        )
      ),
      cycles (
        cycle_number,
        month,
        year
      ),
      collections (
        name,
        price
      ),
      bonus_pieces (
        id,
        description,
        image_url,
        status
      )
    `)
    .eq('id', deliveryId)
    .single();

  if (error) throw error;
  return data as unknown as DeliveryDetail;
}

export async function fetchSubscriberAddress(userId: string): Promise<{ address: string | null } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('address')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchDeliveryChangeHistory(deliveryId: string): Promise<CollectionChangeHistory[]> {
  const { data, error } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('order_id', deliveryId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data || []) as OrderStatusHistoryRow[]).map((row) => ({
    id: row.id,
    previous_collection_id: null,
    new_collection_id: '',
    change_reason: row.order_type || 'manual',
    changed_by_admin: !!row.changed_by,
    created_at: row.created_at,
    previous_collection: row.old_status ? { name: row.old_status } : null,
    new_collection: { name: row.new_status },
  }));
}
