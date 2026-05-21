import { supabase } from "@/integrations/supabase/client";

export type OrderMigrationSubmission = {
  fullName: string;
  email: string;
  phone?: string;
  oldOrderNumber?: string;
  orderDescription: string;
};

export async function submitOrderMigrationRequest(submission: OrderMigrationSubmission) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("order_migrations").insert({
    user_id: user?.id,
    full_name: submission.fullName,
    email: submission.email,
    phone: submission.phone || null,
    old_order_number: submission.oldOrderNumber || null,
    order_description: submission.orderDescription,
    status: "pending",
  });

  if (error) throw error;
}
