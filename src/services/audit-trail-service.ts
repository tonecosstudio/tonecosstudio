/**
 * Audit Trail Service
 * 
 * Handles recording and retrieval of order status change history.
 * Uses the existing order_status_history table.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Status History record from order_status_history table
 */
export interface AuditRecord {
  id: string;
  order_id: string;
  order_type: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_by_name: string | null;
  notes: string | null;
  created_at: string;
}

/**
 * Get all status changes for admin review (audit trail)
 */
export async function getAllCollectionChanges(filters?: {
  changeReason?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: AuditRecord[]; count: number }> {
  let query = supabase
    .from('order_status_history')
    .select('*', { count: 'exact' });

  if (filters?.changeReason && filters.changeReason !== 'all') {
    query = query.eq('order_type', filters.changeReason);
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  query = query.order('created_at', { ascending: false });

  if (filters?.limit) {
    const offset = filters?.offset || 0;
    query = query.range(offset, offset + filters.limit - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Failed to get audit trail:', error.message);
    return { data: [], count: 0 };
  }

  return {
    data: (data || []) as AuditRecord[],
    count: count || 0,
  };
}

/**
 * Search status changes by changed_by_name
 */
export async function searchCollectionChangesBySubscriber(
  searchTerm: string,
  limit: number = 50
): Promise<AuditRecord[]> {
  const { data, error } = await supabase
    .from('order_status_history')
    .select('*')
    .ilike('changed_by_name', `%${searchTerm}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to search audit trail:', error.message);
    return [];
  }

  return (data || []) as AuditRecord[];
}

/**
 * Record a status change in the audit trail
 */
export async function recordStatusChange(params: {
  orderId: string;
  orderType: string;
  oldStatus: string | null;
  newStatus: string;
  changedBy?: string | null;
  changedByName?: string | null;
  notes?: string | null;
}): Promise<AuditRecord | null> {
  const { data, error } = await supabase
    .from('order_status_history')
    .insert({
      order_id: params.orderId,
      order_type: params.orderType,
      old_status: params.oldStatus,
      new_status: params.newStatus,
      changed_by: params.changedBy || null,
      changed_by_name: params.changedByName || null,
      notes: params.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to record status change:', error.message);
    return null;
  }

  return data as AuditRecord;
}

// Legacy exports for backward compatibility
export type CollectionChoiceHistory = AuditRecord;
export type RecordCollectionChangeParams = Parameters<typeof recordStatusChange>[0];
export const getDeliveryChangeHistory = async (deliveryId: string) => {
  const { data } = await getAllCollectionChanges({ limit: 100 });
  return data.filter(r => r.order_id === deliveryId);
};
