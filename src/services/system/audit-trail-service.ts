/**
 * Audit Trail Service
 *
 * Handles recording and retrieval of order status change history.
 * Uses the existing order_status_history table.
 */

import { supabase } from "@/integrations/supabase/client";
import log from "@/lib/logger";
import { callAdminRpc } from "@/services/admin/admin-rpc-gateway";

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

export interface CollectionChoiceHistory {
  id: string;
  delivery_id: string;
  user_id: string;
  previous_collection_id: string | null;
  new_collection_id: string;
  change_reason: 'manual' | 'automatic_maintenance' | 'admin_override';
  changed_by_admin: boolean;
  admin_user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Get all status changes for admin review (audit trail)
 */
export async function getAuditTrailRecords(filters?: {
  orderType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: AuditRecord[]; count: number }> {
  let query = supabase
    .from('order_status_history')
    .select('*', { count: 'exact' });

  if (filters?.orderType && filters.orderType !== 'all') {
    query = query.eq('order_type', filters.orderType);
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
    log.error('Failed to get audit trail', { error: error.message });
    return { data: [], count: 0 };
  }

  return {
    data: (data || []) as AuditRecord[],
    count: count || 0,
  };
}

interface CollectionChoiceHistoryQuery extends PromiseLike<{
  data: CollectionChoiceHistory[] | null;
  error: { message: string } | null;
}> {
  eq(column: "delivery_id", value: string): CollectionChoiceHistoryQuery;
  order(column: "created_at", options?: { ascending?: boolean }): CollectionChoiceHistoryQuery;
}

interface CollectionChoiceHistoryGateway {
  from(table: "collection_choice_history"): {
    select(columns: "*"): CollectionChoiceHistoryQuery;
  };
}

const collectionChoiceHistoryGateway = supabase as unknown as CollectionChoiceHistoryGateway;

/**
 * Search status changes by changed_by_name
 */
export async function searchAuditTrailByResponsible(
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
    log.error('Failed to search audit trail', { error: error.message });
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
  let historyId: string | null = null;

  try {
    historyId = await callAdminRpc<string | null>("admin_record_order_status_history", {
      p_order_id: params.orderId,
      p_order_type: params.orderType,
      p_old_status: params.oldStatus,
      p_new_status: params.newStatus,
      p_notes: params.notes || null,
    });
  } catch (error) {
    log.error('Failed to record status change', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  if (!historyId) {
    return null;
  }

  const { data, error: fetchError } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('id', historyId)
    .single();

  if (fetchError) {
    log.error('Failed to fetch recorded status change', { error: fetchError.message });
    return null;
  }

  return data as AuditRecord;
}

export const getDeliveryChangeHistory = async (deliveryId: string) => {
  const { data, error } = await collectionChoiceHistoryGateway
    .from('collection_choice_history')
    .select('*')
    .eq('delivery_id', deliveryId)
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Failed to get delivery change history', { error: error.message, deliveryId });
    return [];
  }

  return data || [];
};
