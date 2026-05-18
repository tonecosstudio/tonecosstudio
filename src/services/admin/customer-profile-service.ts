import { supabase } from "@/integrations/supabase/client";

export interface CustomerProfileData {
  id: string;
  email?: string;
  full_name?: string;
  phone?: string;
  cpf?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  created_at: string;
  username?: string;
  display_name?: string;
  collector_level?: number;
}

export async function fetchCustomerProfile(userId: string): Promise<CustomerProfileData | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return (data as CustomerProfileData) || null;
}
