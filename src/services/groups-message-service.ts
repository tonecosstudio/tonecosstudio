import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

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
  const { error } = await supabase.from("scheduled_messages").insert({
    group_id: input.groupId,
    message: input.message,
    scheduled_at: input.scheduledAt.toISOString(),
    created_by: input.createdBy,
    status: "pending",
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
  if (input.id) {
    const { error } = await supabase
      .from("message_templates")
      .update({ name: input.name, content: input.content })
      .eq("id", input.id);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("message_templates").insert({
    name: input.name,
    content: input.content,
    created_by: input.createdBy,
  });

  if (error) {
    throw error;
  }
}

export async function deleteGroupMessageTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("message_templates").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
