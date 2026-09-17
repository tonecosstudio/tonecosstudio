import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { normalizeAddressBR, type AddressBR, type DeliveryAddress } from '@/lib/profile';
import { callAuthenticatedEdgeFunction } from '@/services/supabase/edge-function-client';

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

interface ProfileAddressRow {
  delivery_address: Json | null;
}

export interface UpdateDeliveryStatusInput {
  deliveryId: string;
  newStatus: string;
  trackingCode?: string;
  notes?: string;
}

export interface UpdateDeliveryStatusResult {
  success: true;
  message?: string;
  delivery: {
    id: string;
    status: string;
    tracking_code?: string | null;
    updated_at?: string;
  };
}

function isPlainRecord(value: Json | null): value is Record<string, Json> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseUpdateDeliveryStatusResult(
  value: unknown,
  input: UpdateDeliveryStatusInput,
): UpdateDeliveryStatusResult {
  if (!isUnknownRecord(value) || value.success !== true || !isUnknownRecord(value.delivery)) {
    throw new Error('Erro ao atualizar status');
  }

  const delivery = value.delivery;
  if (
    typeof delivery.id !== 'string' ||
    delivery.id !== input.deliveryId ||
    typeof delivery.status !== 'string' ||
    delivery.status !== input.newStatus ||
    (value.message !== undefined && typeof value.message !== 'string') ||
    (delivery.tracking_code !== undefined &&
      delivery.tracking_code !== null &&
      typeof delivery.tracking_code !== 'string') ||
    (delivery.updated_at !== undefined && typeof delivery.updated_at !== 'string')
  ) {
    throw new Error('Erro ao atualizar status');
  }

  return {
    success: true,
    message: typeof value.message === 'string' ? value.message : undefined,
    delivery: {
      id: delivery.id,
      status: delivery.status,
      tracking_code:
        typeof delivery.tracking_code === 'string' || delivery.tracking_code === null
          ? delivery.tracking_code
          : undefined,
      updated_at: typeof delivery.updated_at === 'string' ? delivery.updated_at : undefined,
    },
  };
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

export async function fetchDeliveryDetail(deliveryId: string) {
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
  if (!data) return null;

  return {
    ...data,
    // subscription_deliveries no longer persists a carrier. The tracking helper
    // treats a null carrier as the canonical default rather than fabricating data.
    shipping_carrier: null,
  };
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

export async function updateDeliveryStatus(
  input: UpdateDeliveryStatusInput,
): Promise<UpdateDeliveryStatusResult> {
  const response = await callAuthenticatedEdgeFunction<unknown>(
    'update-delivery-status',
    input,
    'Erro ao atualizar status',
  );

  return parseUpdateDeliveryStatusResult(response, input);
}
