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

interface QuickReplyRpcError {
  message: string;
}

interface QuickReplyRpcClient {
  rpc(
    name: "admin_save_quick_reply",
    args: {
      p_id: string | null;
      p_category: string;
      p_title: string;
      p_message: string;
      p_display_order?: number | null;
    }
  ): Promise<{ data: string | null; error: QuickReplyRpcError | null }>;
  rpc(
    name: "admin_delete_quick_reply",
    args: { p_id: string }
  ): Promise<{ data: string | null; error: QuickReplyRpcError | null }>;
  rpc(
    name: "admin_set_quick_reply_active",
    args: { p_id: string; p_is_active: boolean }
  ): Promise<{ data: string | null; error: QuickReplyRpcError | null }>;
  rpc(
    name: "admin_reorder_quick_replies",
    args: { p_updates: Array<{ id: string; display_order: number }> }
  ): Promise<{ data: unknown; error: QuickReplyRpcError | null }>;
}

const quickReplyRpc = supabase as unknown as QuickReplyRpcClient;

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
  const { error } = await quickReplyRpc.rpc("admin_save_quick_reply", {
    p_id: null,
    p_category: input.category,
    p_title: input.title,
    p_message: input.message,
    p_display_order: displayOrder,
  });
  if (error) throw error;
}

export async function updateQuickReply(id: string, input: QuickReplyInput): Promise<void> {
  const { error } = await quickReplyRpc.rpc("admin_save_quick_reply", {
    p_id: id,
    p_category: input.category,
    p_title: input.title,
    p_message: input.message,
    p_display_order: null,
  });
  if (error) throw error;
}

export async function deleteQuickReply(id: string): Promise<void> {
  const { error } = await quickReplyRpc.rpc("admin_delete_quick_reply", { p_id: id });
  if (error) throw error;
}

export async function toggleQuickReplyActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await quickReplyRpc.rpc("admin_set_quick_reply_active", {
    p_id: id,
    p_is_active: !isActive,
  });
  if (error) throw error;
}

export async function updateQuickRepliesOrder(
  updates: Array<{ id: string; display_order: number }>
): Promise<void> {
  const { error } = await quickReplyRpc.rpc("admin_reorder_quick_replies", {
    p_updates: updates,
  });
  if (error) throw error;
}
