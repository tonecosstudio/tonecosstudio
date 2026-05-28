import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { normalizeAddressBR, type AddressBR, type DeliveryAddress } from '@/lib/profile';

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
  shipping_carrier: string | null;
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
      price: number | null;
    };
  } | null;
  cycles: {
    cycle_number: number;
    month: number;
    year: number;
  } | null;
  collections: {
    name: string;
    price: number | null;
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

interface CollectionPricingRow {
  price_full: number;
}

interface ProfileAddressRow {
  delivery_address: Json | null;
}

export interface UpdateDeliveryStatusInput {
  deliveryId: string;
  newStatus: string;
  trackingCode?: string;
  notes?: string;
}

async function fetchDeliveryCollectionPrice(collectionId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_collection_pricing', {
    p_collection_id: collectionId,
  });

  if (error) throw error;

  const [pricing] = (data ?? []) as CollectionPricingRow[];
  if (!pricing) {
    throw new Error(`Pricing not found for collection ${collectionId}`);
  }

  return pricing.price_full;
}

function isPlainRecord(value: Json | null): value is Record<string, Json> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatAddress(address: AddressBR | null): string | null {
  if (!address) return null;

  const streetLine = [address.rua, address.numero].filter(Boolean).join(', ');
  const neighborhoodLine = address.bairro;
  const cityLine = [address.cidade, address.uf].filter(Boolean).join(' - ');
  const zipLine = address.cep ? `CEP: ${address.cep}` : null;

  return [streetLine, address.complemento, neighborhoodLine, cityLine, zipLine]
    .filter(Boolean)
    .join('\n') || null;
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
      shipping_carrier,
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
          name
        )
      ),
      cycles (
        cycle_number,
        month,
        year
      ),
      collections (
        name
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

  const delivery = data as unknown as DeliveryDetail;
  const collectionId = delivery.collection_id ?? delivery.subscriptions?.collection_id ?? null;
  const collectionPrice = collectionId ? await fetchDeliveryCollectionPrice(collectionId) : null;

  if (delivery.collections) {
    delivery.collections.price = collectionPrice;
  }

  if (delivery.subscriptions?.collections) {
    delivery.subscriptions.collections.price = collectionPrice;
  }

  return delivery;
}

export async function fetchSubscriberAddress(userId: string): Promise<{ address: string | null } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('delivery_address')
    .eq('id', userId)
    .single();

  if (error) throw error;

  const profile = data as ProfileAddressRow | null;
  const deliveryAddress = isPlainRecord(profile?.delivery_address ?? null)
    ? (profile?.delivery_address as DeliveryAddress)
    : null;

  return {
    address: formatAddress(normalizeAddressBR(deliveryAddress)),
  };
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

export async function updateDeliveryStatus(input: UpdateDeliveryStatusInput) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-delivery-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao atualizar status');
  }

  return response.json();
}
