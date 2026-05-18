import { supabase } from "@/integrations/supabase/client";

export interface SupportChatCurrentUser {
  id: string;
  name: string;
}

export async function fetchSupportChatCurrentUser(): Promise<SupportChatCurrentUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

export function getSupportAttachmentPublicUrl(filePath: string): string {
  const { data } = supabase.storage.from("support-attachments").getPublicUrl(filePath);
  return data.publicUrl;
}
