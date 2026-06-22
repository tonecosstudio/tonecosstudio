import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { callAdminRpc } from "@/services/admin/admin-rpc-gateway";

export type GroupMessageTemplate = Tables<"message_templates">;

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
  await callAdminRpc("admin_schedule_group_message", {
    p_group_id: input.groupId,
    p_message: input.message,
    p_scheduled_at: input.scheduledAt.toISOString(),
  });
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
  await callAdminRpc("admin_save_group_message_template", {
    p_template_id: input.id ?? null,
    p_name: input.name,
    p_content: input.content,
  });
}

export async function deleteGroupMessageTemplate(id: string): Promise<void> {
  await callAdminRpc("admin_delete_group_message_template", {
    p_template_id: id,
  });
}
