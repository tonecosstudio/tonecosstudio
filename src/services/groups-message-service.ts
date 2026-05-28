import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type GroupMessageTemplate = Tables<"message_templates">;

interface GroupMessageRpcError {
  message: string;
}

interface GroupMessageRpcClient {
  rpc(
    name: "admin_schedule_group_message",
    args: { p_group_id: string; p_message: string; p_scheduled_at: string }
  ): Promise<{ data: unknown; error: GroupMessageRpcError | null }>;
  rpc(
    name: "admin_save_group_message_template",
    args: { p_template_id: string | null; p_name: string; p_content: string }
  ): Promise<{ data: GroupMessageTemplate | null; error: GroupMessageRpcError | null }>;
  rpc(
    name: "admin_delete_group_message_template",
    args: { p_template_id: string }
  ): Promise<{ data: string | null; error: GroupMessageRpcError | null }>;
}

const groupMessageRpc = supabase as unknown as GroupMessageRpcClient;

interface ScheduleGroupMessageInput {
  groupId: string;
  message: string;
  scheduledAt: Date;
  createdBy: string;
}

interface SaveGroupMessageTemplateInput {
  id?: string;
  name: string;
  content: string;
  createdBy: string;
}

export async function scheduleGroupMessage(input: ScheduleGroupMessageInput): Promise<void> {
  const { error } = await groupMessageRpc.rpc("admin_schedule_group_message", {
    p_group_id: input.groupId,
    p_message: input.message,
    p_scheduled_at: input.scheduledAt.toISOString(),
  });

  if (error) {
    throw error;
  }
}

export async function listGroupMessageTemplates(): Promise<GroupMessageTemplate[]> {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function saveGroupMessageTemplate(
  input: SaveGroupMessageTemplateInput
): Promise<void> {
  const { error } = await groupMessageRpc.rpc("admin_save_group_message_template", {
    p_template_id: input.id ?? null,
    p_name: input.name,
    p_content: input.content,
  });

  if (error) {
    throw error;
  }
}

export async function deleteGroupMessageTemplate(id: string): Promise<void> {
  const { error } = await groupMessageRpc.rpc("admin_delete_group_message_template", {
    p_template_id: id,
  });

  if (error) {
    throw error;
  }
}
