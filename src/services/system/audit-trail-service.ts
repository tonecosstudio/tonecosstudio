import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import log from "@/lib/logger";

export type AuditRecord = Database["public"]["Tables"]["order_status_history"]["Row"];

/**
 * Get status changes for the administrative audit trail.
 * RLS limits this table to admins, except for a customer's own manual-payment history.
 */
export async function getAuditTrailRecords(filters?: {
  orderType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: AuditRecord[]; count: number }> {
  let query = supabase
    .from("order_status_history")
    .select("*", { count: "exact" });

  if (filters?.orderType && filters.orderType !== "all") {
    query = query.eq("order_type", filters.orderType);
  }

  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  query = query.order("created_at", { ascending: false });

  if (filters?.limit) {
    const offset = filters.offset ?? 0;
    query = query.range(offset, offset + filters.limit - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    log.error("Failed to get audit trail", { error: error.message });
    return { data: [], count: 0 };
  }

  return {
    data: data ?? [],
    count: count ?? 0,
  };
}

/** Search status changes by the server-recorded responsible name. */
export async function searchAuditTrailByResponsible(
  searchTerm: string,
  limit: number = 50,
): Promise<AuditRecord[]> {
  const { data, error } = await supabase
    .from("order_status_history")
    .select("*")
    .ilike("changed_by_name", `%${searchTerm}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    log.error("Failed to search audit trail", { error: error.message });
    return [];
  }

  return data ?? [];
}
