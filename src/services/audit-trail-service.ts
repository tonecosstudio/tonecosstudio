// @ts-nocheck
/**
 * Audit Trail Service
 * 
 * Handles recording and retrieval of collection choice change history.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Collection Choice History record
 */
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
 * Parameters for recording a collection change
 */
export interface RecordCollectionChangeParams {
  deliveryId: string;
  userId: string;
  previousCollectionId: string | null;
  newCollectionId: string;
  changeReason: 'manual' | 'automatic_maintenance' | 'admin_override';
  changedByAdmin?: boolean;
  adminUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Record a collection choice change in the audit trail
 * 
 * This function creates a record in the collection_choice_history table
 * to track all changes to delivery collection choices.
 * 
 * @param params - The change parameters
 * @returns Promise<CollectionChoiceHistory> - The created audit record
 * @throws Error if insert fails
 * 
 * Requirements: 8.1, 8.2, 8.3
 */
export async function recordCollectionChange(
  params: RecordCollectionChangeParams
): Promise<CollectionChoiceHistory> {
  const {
    deliveryId,
    userId,
    previousCollectionId,
    newCollectionId,
    changeReason,
    changedByAdmin = false,
    adminUserId = null,
    ipAddress = null,
    userAgent = null,
  } = params;

  const { data, error } = await supabase
    .from('collection_choice_history' as any)
    .insert({
      delivery_id: deliveryId,
      user_id: userId,
      previous_collection_id: previousCollectionId,
      new_collection_id: newCollectionId,
      change_reason: changeReason,
      changed_by_admin: changedByAdmin,
      admin_user_id: adminUserId,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record collection change: ${error.message}`);
  }

  return data as unknown as CollectionChoiceHistory;
}

/**
 * Get collection change history for a specific delivery
 * 
 * @param deliveryId - The ID of the delivery
 * @returns Promise<CollectionChoiceHistory[]> - Array of change records
 * 
 * Requirements: 8.4, 21.4
 */
export async function getDeliveryChangeHistory(
  deliveryId: string
): Promise<CollectionChoiceHistory[]> {
  const { data, error } = await supabase
    .from('collection_choice_history' as any)
    .select(`
      *,
      previous_collection:collections!collection_choice_history_previous_collection_id_fkey(id, name),
      new_collection:collections!collection_choice_history_new_collection_id_fkey(id, name)
    `)
    .eq('delivery_id', deliveryId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get delivery change history: ${error.message}`);
  }

  return (data || []) as unknown as CollectionChoiceHistory[];
}

/**
 * Get all collection changes for admin review
 * 
 * @param filters - Optional filters for the query
 * @returns Promise<CollectionChoiceHistory[]> - Array of change records
 * 
 * Requirements: 8.5, 8.6
 */
export async function getAllCollectionChanges(filters?: {
  userId?: string;
  collectionId?: string;
  changeReason?: 'manual' | 'automatic_maintenance' | 'admin_override';
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: CollectionChoiceHistory[]; count: number }> {
  let query = supabase
    .from('collection_choice_history' as any)
    .select(`
      *,
      user:profiles!collection_choice_history_user_id_fkey(id, email, full_name),
      previous_collection:collections!collection_choice_history_previous_collection_id_fkey(id, name),
      new_collection:collections!collection_choice_history_new_collection_id_fkey(id, name),
      admin_user:profiles!collection_choice_history_admin_user_id_fkey(id, email, full_name)
    `, { count: 'exact' });

  // Apply filters
  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters?.collectionId) {
    query = query.or(`previous_collection_id.eq.${filters.collectionId},new_collection_id.eq.${filters.collectionId}`);
  }

  if (filters?.changeReason) {
    query = query.eq('change_reason', filters.changeReason);
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  // Order by most recent first
  query = query.order('created_at', { ascending: false });

  // Apply pagination
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to get collection changes: ${error.message}`);
  }

  return {
    data: (data || []) as unknown as CollectionChoiceHistory[],
    count: count || 0,
  };
}

/**
 * Search collection changes by subscriber name or email
 * 
 * @param searchTerm - The search term
 * @param limit - Maximum number of results
 * @returns Promise<CollectionChoiceHistory[]> - Array of matching change records
 * 
 * Requirements: 8.6
 */
export async function searchCollectionChangesBySubscriber(
  searchTerm: string,
  limit: number = 50
): Promise<CollectionChoiceHistory[]> {
  const { data, error } = await supabase
    .from('collection_choice_history' as any)
    .select(`
      *,
      user:profiles!collection_choice_history_user_id_fkey(id, email, full_name),
      previous_collection:collections!collection_choice_history_previous_collection_id_fkey(id, name),
      new_collection:collections!collection_choice_history_new_collection_id_fkey(id, name)
    `)
    .or(`user.email.ilike.%${searchTerm}%,user.full_name.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search collection changes: ${error.message}`);
  }

  return (data || []) as unknown as CollectionChoiceHistory[];
}
