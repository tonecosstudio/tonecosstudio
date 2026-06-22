import { supabase } from "@/integrations/supabase/client";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";

export interface QuickReply {
  id: string;
  category: string;
  title: string;
  message: string;
  shortcut: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuickReplyInput {
  category: string;
  title: string;
  message: string;
  shortcut?: string | null;
}

export async function fetchQuickReplies(): Promise<QuickReply[]> {
  const { data, error } = await supabase
    .from("quick_replies")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data || []) as QuickReply[];
}

export async function fetchActiveQuickReplies(): Promise<QuickReply[]> {
  const { data, error } = await supabase
    .from("quick_replies")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data || []) as QuickReply[];
}

export async function createQuickReply(input: QuickReplyInput, displayOrder: number): Promise<void> {
  await callAdminRpc("admin_save_quick_reply", {
    p_id: null,
    p_category: input.category,
    p_title: input.title,
    p_message: input.message,
    p_shortcut: input.shortcut ?? null,
    p_display_order: displayOrder,
  });
}

export async function updateQuickReply(id: string, input: QuickReplyInput): Promise<void> {
  await callAdminRpc("admin_save_quick_reply", {
    p_id: id,
    p_category: input.category,
    p_title: input.title,
    p_message: input.message,
    p_shortcut: input.shortcut ?? null,
    p_display_order: null,
  });
}

export async function deleteQuickReply(id: string): Promise<void> {
  await callAdminRpc("admin_delete_quick_reply", { p_id: id });
}

export async function toggleQuickReplyActive(id: string, isActive: boolean): Promise<void> {
  await callAdminRpc("admin_set_quick_reply_active", {
    p_id: id,
    p_is_active: !isActive,
  });
}

export async function updateQuickRepliesOrder(
  updates: Array<{ id: string; display_order: number }>
): Promise<void> {
  await callAdminRpc("admin_reorder_quick_replies", {
    p_updates: updates,
  });
}
