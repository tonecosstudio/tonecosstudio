import { supabase } from "@/integrations/supabase/client";

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

export async function fetchContacts(): Promise<Contact[]> {
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .order("created_at", { ascending: false });

  if (usersError) throw usersError;

  const enrichedContacts = await Promise.all(
    (users || []).map(async (user) => {
      const [payments, subscriptions, quotes] = await Promise.all([
        supabase
          .from("manual_payments")
          .select("id, created_at")
          .eq("user_id", user.id)
          .not("quote_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1),
        supabase.from("quotes").select("id").eq("user_id", user.id).limit(1),
      ]);

      return {
        ...user,
        has_orders: (payments.data?.length || 0) > 0,
        has_subscription: (subscriptions.data?.length || 0) > 0,
        has_quotes: (quotes.data?.length || 0) > 0,
        last_order_date: payments.data?.[0]?.created_at,
      } as Contact;
    })
  );

  return enrichedContacts;
}
