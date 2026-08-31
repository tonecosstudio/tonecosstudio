import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { getSupportAttachmentSignedUrl } from "@/services/support/support-attachment-url-service";
import type { Attachment, Message, SenderType } from "@/types/support";

export type SupportMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: SenderType;
  message: string;
  is_internal: boolean | null;
  read_by_admin: boolean | null;
  read_by_customer: boolean | null;
  created_at: string;
  updated_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

export type SupportAttachmentRow = {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  thumbnail_path?: string | null;
  uploaded_by: string;
  created_at: string;
};

export type HydratedSupportAttachment = Attachment & {
  access_url?: string;
  thumbnail_url?: string;
};

function getFallbackSenderName(senderType: SenderType): string {
  if (senderType === "admin") return "Administrador";
  if (senderType === "customer") return "Cliente";
  return "Sistema";
}

async function toAttachment(row: SupportAttachmentRow): Promise<HydratedSupportAttachment> {
  const attachment: HydratedSupportAttachment = {
    id: row.id,
    message_id: row.message_id,
    file_name: row.file_name,
    file_path: row.file_path,
    file_size: row.file_size ?? 0,
    file_type: row.file_type ?? "application/octet-stream",
    thumbnail_path: row.thumbnail_path ?? undefined,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
  };

  const [accessResult, thumbnailResult] = await Promise.allSettled([
    getSupportAttachmentSignedUrl(row.file_path),
    row.thumbnail_path
      ? getSupportAttachmentSignedUrl(row.thumbnail_path)
      : Promise.resolve(undefined),
  ]);

  if (accessResult.status === "fulfilled") {
    attachment.access_url = accessResult.value;
  } else {
    log.warn("Failed to create signed support attachment URL", {
      error: accessResult.reason,
      attachmentId: row.id,
    });
  }

  if (thumbnailResult.status === "fulfilled" && thumbnailResult.value) {
    attachment.thumbnail_url = thumbnailResult.value;
  }

  return attachment;
}

async function fetchAttachmentsByMessageIds(messageIds: string[]): Promise<Map<string, Attachment[]>> {
  if (messageIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("support_attachments")
    .select("*")
    .in("message_id", messageIds);

  if (error) {
    log.warn("Failed to load support message attachments", { error, messageIds });
    return new Map();
  }

  const attachments = await Promise.all(
    ((data ?? []) as SupportAttachmentRow[]).map((row) => toAttachment(row)),
  );

  return attachments.reduce((map, attachment) => {
    const existing = map.get(attachment.message_id) ?? [];
    existing.push(attachment);
    map.set(attachment.message_id, existing);
    return map;
  }, new Map<string, Attachment[]>());
}

async function fetchSenderNameMap(senderIds: string[]): Promise<Map<string, string>> {
  if (senderIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", senderIds);

  if (error) {
    log.warn("Failed to load support message sender names", { error, senderIds });
    return new Map();
  }

  return new Map(
    (data ?? []).map((profile) => [profile.id, profile.full_name || profile.email || "Usuario"])
  );
}

function normalizeSupportMessage(
  row: SupportMessageRow,
  senderName?: string,
  attachments: Attachment[] = []
): Message {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    sender_type: row.sender_type,
    message: row.message,
    created_at: row.created_at,
    updated_at: row.updated_at,
    edited_at: row.edited_at ?? undefined,
    deleted_at: row.deleted_at ?? undefined,
    deleted_by: row.deleted_by ?? undefined,
    sender_name: senderName || getFallbackSenderName(row.sender_type),
    attachments,
    is_internal: row.is_internal ?? false,
    read_by_admin: row.read_by_admin ?? false,
    read_by_customer: row.read_by_customer ?? false,
  };
}

export async function hydrateSupportMessages(rows: SupportMessageRow[]): Promise<Message[]> {
  const messageIds = rows.map((row) => row.id);
  const senderIds = [...new Set(rows.map((row) => row.sender_id))];

  const [attachmentsByMessageId, senderNameMap] = await Promise.all([
    fetchAttachmentsByMessageIds(messageIds),
    fetchSenderNameMap(senderIds),
  ]);

  return rows.map((row) =>
    normalizeSupportMessage(
      row,
      senderNameMap.get(row.sender_id),
      attachmentsByMessageId.get(row.id) ?? []
    )
  );
}

export async function hydrateSupportMessage(row: SupportMessageRow): Promise<Message> {
  const [message] = await hydrateSupportMessages([row]);
  return message;
}

export function normalizeSupportMessageResult(message: Message): Message {
  return normalizeSupportMessage(message as SupportMessageRow, message.sender_name, message.attachments ?? []);
}
