import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  requireAdminRpcMatchingId,
  requireAdminRpcRecord,
  requireAdminRpcRecordMatchingId,
  requireAdminRpcUuid,
} from "@/services/admin/rpc/admin-rpc-results";

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
  const result = await callAdminRpc<unknown>("admin_schedule_group_message", {
    p_group_id: input.groupId,
    p_message: input.message,
    p_scheduled_at: input.scheduledAt.toISOString(),
  });

  const record = requireAdminRpcRecord(result, "Group message scheduling");
  requireAdminRpcUuid(record.id, "Group message scheduling");
  requireAdminRpcMatchingId(record.group_id, input.groupId, "Group message scheduling");

  if (
    record.message !== input.message.trim() ||
    record.status !== "pending" ||
    typeof record.scheduled_at !== "string" ||
    Number.isNaN(Date.parse(record.scheduled_at))
  ) {
    throw new Error("Group message scheduling returned inconsistent data");
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
  const result = await callAdminRpc<unknown>("admin_save_group_message_template", {
    p_template_id: input.id ?? null,
    p_name: input.name,
    p_content: input.content,
  });

  const operation = "Group message template save";
  const record = input.id
    ? requireAdminRpcRecordMatchingId(result, input.id, operation)
    : requireAdminRpcRecord(result, operation);

  requireAdminRpcUuid(record.id, operation);
  if (record.name !== input.name.trim() || record.content !== input.content.trim()) {
    throw new Error(`${operation} returned inconsistent data`);
  }
}

export async function deleteGroupMessageTemplate(id: string): Promise<void> {
  const result = await callAdminRpc("admin_delete_group_message_template", {
    p_template_id: id,
  });
  requireAdminRpcMatchingId(result, id, "Group message template deletion");
}
