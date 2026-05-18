import { supabase } from "@/integrations/supabase/client";

export interface SupportQuickReply {
  id: string;
  title: string;
  shortcut: string;
  category: string;
  message: string;
  is_active: boolean;
}

export async function fetchActiveSupportQuickReplies(): Promise<SupportQuickReply[]> {
  const { data, error } = await supabase
    .from("support_quick_replies")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true });

  if (error) throw error;
  return (data || []) as SupportQuickReply[];
}
