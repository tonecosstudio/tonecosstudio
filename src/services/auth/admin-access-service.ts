import { supabase } from "@/integrations/supabase/client";

export interface BootstrapInitialAdminResult {
  ok?: boolean;
  error?: string;
}

export async function bootstrapInitialAdmin(): Promise<BootstrapInitialAdminResult> {
  const { data, error } = await supabase.functions.invoke("bootstrap-admin", { body: {} });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? {}) as BootstrapInitialAdminResult;
}

export async function signOutCurrentUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}
