import { supabase } from "@/integrations/supabase/client";
import { fetchCustomerRelationshipSummary } from "@/services/admin/customers/customer-relationship-service";

export interface Contact {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  has_orders?: boolean;
  has_subscription?: boolean;
  has_quotes?: boolean;
  last_order_date?: string;
}

interface ContactProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

export async function fetchContacts(): Promise<Contact[]> {
  const [{ data: users, error: usersError }, relationships] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .order("created_at", { ascending: false }),
    fetchCustomerRelationshipSummary(),
  ]);

  if (usersError) throw usersError;

  return ((users ?? []) as ContactProfileRow[]).map((user) => ({
    id: user.id,
    email: user.email ?? "",
    full_name: user.full_name ?? undefined,
    created_at: user.created_at,
    has_orders: relationships.buyerIds.has(user.id),
    has_subscription: relationships.subscriberIds.has(user.id),
    has_quotes: relationships.quotedIds.has(user.id),
    last_order_date: relationships.lastApprovedPaymentAtByUserId.get(user.id),
  }));
}
