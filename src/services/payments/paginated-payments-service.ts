import { supabase } from "@/integrations/supabase/client";
import { sanitizePostgrestSearchTerm } from "@/lib/postgrest-search";
import type { ManualPayment, PaymentFilters } from "@/types/manual-payment";

const PAGE_SIZE = 25;

export interface PaginatedPaymentsResult {
  payments: ManualPayment[];
  nextCursor: number | null;
}

export async function fetchPaginatedPayments(
  filters: PaymentFilters,
  pageParam: number = 0,
): Promise<PaginatedPaymentsResult> {
  let query = supabase.from("manual_payments").select("*", { count: "exact" });

  if (filters.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }

  if (filters.payment_method_id) {
    query = query.eq("payment_method_id", filters.payment_method_id);
  }

  if (filters.date_from) {
    query = query.gte("created_at", filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte("created_at", filters.date_to);
  }

  if (filters.search) {
    const search = sanitizePostgrestSearchTerm(filters.search);
    if (search) {
      query = query.or(`reference_number.ilike.%${search}%`);
    }
  }

  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  query = query.range(from, to).order("created_at", { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch payments: ${error.message}`);
  }

  const payments = (data || []) as ManualPayment[];
  const hasMore = count ? from + payments.length < count : false;

  return {
    payments,
    nextCursor: hasMore ? pageParam + 1 : null,
  };
}
