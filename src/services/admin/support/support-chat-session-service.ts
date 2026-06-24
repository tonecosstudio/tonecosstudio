import { supabase } from "@/integrations/supabase/client";
import { getCurrentAuthUser } from "@/services/auth/current-user";

export interface SupportChatCurrentUser {
  id: string;
  name: string;
}

export async function fetchSupportChatCurrentUser(): Promise<SupportChatCurrentUser | null> {
  const user = await getCurrentAuthUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    name: profile?.full_name || user.email || "Admin",
  };
}
