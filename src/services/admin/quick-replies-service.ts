import { supabase } from "@/integrations/supabase/client";

export interface QuickReply {
  id: string;
  category: string;
  title: string;
  message: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuickReplyInput {
  category: string;
  title: string;
  message: string;
}

export async function fetchQuickReplies(): Promise<QuickReply[]> {
  const { data, error } = await supabase
    .from("quick_replies")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data || []) as QuickReply[];
}

export async function createQuickReply(input: QuickReplyInput, displayOrder: number): Promise<void> {
  const { error } = await supabase.from("quick_replies").insert({
    ...input,
    display_order: displayOrder,
  });
  if (error) throw error;
}

export async function updateQuickReply(id: string, input: QuickReplyInput): Promise<void> {
  const { error } = await supabase
    .from("quick_replies")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteQuickReply(id: string): Promise<void> {
  const { error } = await supabase
    .from("quick_replies")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function toggleQuickReplyActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from("quick_replies")
    .update({ is_active: !isActive })
    .eq("id", id);
  if (error) throw error;
}

export async function updateQuickRepliesOrder(
  updates: Array<{ id: string; display_order: number }>
): Promise<void> {
  for (const update of updates) {
    const { error } = await supabase
      .from("quick_replies")
      .update({ display_order: update.display_order })
      .eq("id", update.id);
    if (error) throw error;
  }
}
