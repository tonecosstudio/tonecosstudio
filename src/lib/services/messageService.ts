import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import type {
  Attachment,
  Message,
  PaginationOptions,
  SendMessageData,
  SenderType,
} from "@/types/support";
import type { GroupMessage, GroupAttachment, Pagination, EnrichedGroupMessage } from "@/types/groups";
import { fileUploadService } from "./fileUploadService";
import { sanitizeGroupMessage } from "@/lib/utils/sanitize";

interface SupportMessageRpcError {
  message: string;
}

type SupportMessageRow = {
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

type SupportAttachmentRow = {
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

interface SupportMessageRpcClient {
  rpc(
    name: "send_support_message",
    args: {
      p_conversation_id: string;
      p_sender_type: SendMessageData["sender_type"];
      p_message: string;
      p_is_internal: boolean;
    }
  ): Promise<{ data: Message | null; error: SupportMessageRpcError | null }>;
  rpc(
    name: "edit_support_message",
    args: { p_message_id: string; p_message: string }
  ): Promise<{ data: Message | null; error: SupportMessageRpcError | null }>;
  rpc(
    name: "admin_edit_internal_support_note",
    args: { p_message_id: string; p_message: string }
  ): Promise<{ data: Message | null; error: SupportMessageRpcError | null }>;
  rpc(
    name: "admin_delete_support_message",
    args: { p_message_id: string }
  ): Promise<{ data: string | null; error: SupportMessageRpcError | null }>;
  rpc(
    name: "admin_delete_internal_support_note",
    args: { p_message_id: string }
  ): Promise<{ data: string | null; error: SupportMessageRpcError | null }>;
  rpc(
    name: "mark_support_messages_read",
    args: { p_message_ids: string[]; p_reader_type: "admin" | "customer" }
  ): Promise<{ data: number | null; error: SupportMessageRpcError | null }>;
  rpc(
    name: "record_support_attachment_upload",
    args: {
      p_message_id: string;
      p_uploaded_by: string;
      p_file_name: string;
      p_file_path: string;
      p_file_size: number;
      p_file_type: string;
      p_thumbnail_path?: string | null;
      p_public_url?: string | null;
    }
  ): Promise<{ data: Attachment | null; error: SupportMessageRpcError | null }>;
  rpc(
    name: "admin_send_chat_group_message",
    args: {
      p_group_id: string;
      p_message: string;
      p_action_button_text?: string | null;
      p_action_button_url?: string | null;
      p_link_text?: string | null;
      p_link_url?: string | null;
    }
  ): Promise<{ data: GroupMessage | null; error: SupportMessageRpcError | null }>;
  rpc(
    name: "admin_register_chat_group_attachment",
    args: {
      p_message_id: string;
      p_uploaded_by: string;
      p_file_name: string;
      p_file_path: string;
      p_file_size: number;
      p_file_type: string;
      p_thumbnail_path?: string | null;
    }
  ): Promise<{ data: GroupAttachment | null; error: SupportMessageRpcError | null }>;
  rpc(
    name: "admin_edit_chat_group_message",
    args: { p_message_id: string; p_message: string }
  ): Promise<{ data: GroupMessage | null; error: SupportMessageRpcError | null }>;
  rpc(
    name: "admin_delete_chat_group_message",
    args: { p_message_id: string }
  ): Promise<{ data: string | null; error: SupportMessageRpcError | null }>;
}

const supportMessageRpc = supabase as unknown as SupportMessageRpcClient;

function toSupportAttachment(row: SupportAttachmentRow): Attachment {
  return {
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
}

export class MessageService {
  /**
   * Lista mensagens de uma conversa
   */
  async listMessages(conversationId: string, options?: PaginationOptions): Promise<Message[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    let query = supabase
      .from("support_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (limit) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      log.error("Failed to list support messages", { error, conversationId });
      throw new Error("Erro ao carregar mensagens");
    }

    // Buscar anexos separadamente
    const messages = (data || []) as unknown as SupportMessageRow[];
    const messageIds = messages.map((msg) => msg.id);

    // Batch fetch all attachments at once instead of per-message
    let allAttachments: Attachment[] = [];
    if (messageIds.length > 0) {
      const { data: attachmentsData } = await supabase
        .from("support_attachments")
        .select("*")
        .in("message_id", messageIds);
      allAttachments = ((attachmentsData || []) as unknown as SupportAttachmentRow[]).map(
        toSupportAttachment
      );
    }

    // Group attachments by message_id
    const attachmentsByMessage = new Map<string, Attachment[]>();
    for (const att of allAttachments) {
      const existing = attachmentsByMessage.get(att.message_id) || [];
      existing.push(att);
      attachmentsByMessage.set(att.message_id, existing);
    }

    // Batch fetch sender profiles
    const senderIds = [...new Set(messages.map((msg) => msg.sender_id))];
    const profilesMap = new Map<string, string>();
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", senderIds);
      if (profiles) {
        for (const p of profiles) {
          profilesMap.set(p.id, p.full_name || p.email || "Usuário");
        }
      }
    }

    return messages.map((msg) => ({
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      sender_type: msg.sender_type,
      message: msg.message,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
      edited_at: msg.edited_at ?? undefined,
      deleted_at: msg.deleted_at ?? undefined,
      deleted_by: msg.deleted_by ?? undefined,
      sender_name: this.getSenderNameFromProfile(msg.sender_type, msg.sender_id, profilesMap),
      attachments: attachmentsByMessage.get(msg.id) || [],
      is_internal: msg.is_internal ?? false,
      read_by_admin: msg.read_by_admin ?? false,
      read_by_customer: msg.read_by_customer ?? false,
    }));
  }

  /**
   * Envia uma mensagem
   */
  async sendMessage(messageData: SendMessageData): Promise<Message> {
    if (messageData.sender_type === "system") {
      throw new Error("Mensagens de sistema devem ser criadas no backend");
    }

    const { data, error } = await supportMessageRpc.rpc("send_support_message", {
      p_conversation_id: messageData.conversation_id,
      p_sender_type: messageData.sender_type,
      p_message: messageData.message,
      p_is_internal: messageData.is_internal || false,
    });

    if (error || !data) {
      log.error("Failed to send support message", {
        error,
        conversationId: messageData.conversation_id,
        senderId: messageData.sender_id,
      });
      throw new Error("Erro ao enviar mensagem");
    }

    // Se houver anexos, criar registros
    if (messageData.attachments && messageData.attachments.length > 0) {
      await this.createAttachments(
        data.id,
        messageData.conversation_id,
        messageData.sender_id,
        messageData.attachments
      );
    }

    // Se for mensagem do admin para cliente, enviar notificação por email
    if (messageData.sender_type === "admin" && !messageData.is_internal) {
      this.sendEmailNotification(
        data.id,
        messageData.conversation_id,
        messageData.sender_id,
        messageData.message
      ).catch((error) => {
        log.error("Failed to enqueue support email notification", {
          error,
          messageId: data.id,
          conversationId: messageData.conversation_id,
        });
      });
    }

    return {
      ...data,
      sender_name: this.getSenderName(data.sender_type),
      attachments: [],
      is_internal: data.is_internal || false,
      read_by_admin: data.read_by_admin || false,
      read_by_customer: data.read_by_customer || false,
    };
  }

  /**
   * Envia notificação por email via Edge Function
   */
  private async sendEmailNotification(
    messageId: string,
    conversationId: string,
    senderId: string,
    messageContent: string
  ): Promise<void> {
    try {
      const { data: conversation } = await supabase
        .from("support_conversations")
        .select("user_id")
        .eq("id", conversationId)
        .single();

      if (!conversation || conversation.user_id === senderId) {
        return;
      }

      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          conversationId,
          messageId,
          recipientUserId: conversation.user_id,
          messageContent,
        },
      });

      if (error) {
        log.error("Failed to invoke support email Edge Function", {
          error,
          messageId,
          conversationId,
          recipientUserId: conversation.user_id,
        });
      }
    } catch (error) {
      log.error("Failed to send support email notification", { error, messageId, conversationId });
    }
  }

  /**
   * Adiciona uma nota interna
   */
  async addInternalNote(
    conversationId: string,
    senderId: string,
    message: string
  ): Promise<Message> {
    return this.sendMessage({
      conversation_id: conversationId,
      sender_id: senderId,
      sender_type: "admin",
      message,
      is_internal: true,
    });
  }

  /**
   * Edita uma nota interna (apenas dentro de 5 minutos)
   */
  async editInternalNote(messageId: string, newMessage: string): Promise<Message> {
    const { data, error } = await supportMessageRpc.rpc("admin_edit_internal_support_note", {
      p_message_id: messageId,
      p_message: newMessage,
    });

    if (error || !data) {
      log.error("Failed to edit internal support note", { error, messageId });
      throw new Error("Erro ao editar nota interna");
    }

    return {
      ...data,
      sender_name: this.getSenderName(data.sender_type),
      attachments: [],
      is_internal: data.is_internal || false,
      read_by_admin: data.read_by_admin || false,
      read_by_customer: data.read_by_customer || false,
    };
  }

  /**
   * Deleta uma nota interna
   */
  async deleteInternalNote(messageId: string): Promise<void> {
    const { error } = await supportMessageRpc.rpc("admin_delete_internal_support_note", {
      p_message_id: messageId,
    });

    if (error) {
      log.error("Failed to delete internal support note", { error, messageId });
      throw new Error("Erro ao deletar nota interna");
    }
  }

  /**
   * Marca mensagens como lidas
   */
  async markAsRead(messageIds: string[], readerType: "admin" | "customer"): Promise<void> {
    const { error } = await supportMessageRpc.rpc("mark_support_messages_read", {
      p_message_ids: messageIds,
      p_reader_type: readerType,
    });

    if (error) {
      log.error("Failed to mark support messages as read", { error, messageIds, readerType });
      throw new Error("Erro ao marcar mensagens como lidas");
    }
  }

  /**
   * Deleta uma mensagem (soft delete)
   * Uses has_role function to check admin status
   */
  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supportMessageRpc.rpc("admin_delete_support_message", {
      p_message_id: messageId,
    });

    if (error) {
      log.error("Failed to delete support message", { error, messageId });
      throw new Error("Erro ao deletar mensagem");
    }
  }

  /**
   * Edita uma mensagem
   * Apenas o autor pode editar, dentro de 15 minutos
   */
  async editMessage(messageId: string, newMessage: string): Promise<Message> {
    const { data, error } = await supportMessageRpc.rpc("edit_support_message", {
      p_message_id: messageId,
      p_message: newMessage,
    });

    if (error || !data) {
      log.error("Failed to edit support message", { error, messageId });
      throw new Error("Erro ao editar mensagem");
    }

    return {
      ...data,
      sender_name: this.getSenderName(data.sender_type),
      attachments: [],
      is_internal: data.is_internal || false,
      read_by_admin: data.read_by_admin || false,
      read_by_customer: data.read_by_customer || false,
    };
  }

  /**
   * Cria anexos para uma mensagem
   */
  private async createAttachments(
    messageId: string,
    conversationId: string,
    uploadedBy: string,
    attachments: File[]
  ): Promise<void> {
    for (const attachment of attachments) {
      await fileUploadService.uploadFile(attachment, conversationId, messageId, uploadedBy);
    }
  }

  /**
   * Gets sender name from profile map (batch loaded)
   */
  private getSenderNameFromProfile(
    senderType: string,
    senderId: string,
    profilesMap: Map<string, string>
  ): string {
    if (senderType === "system") return "Sistema";
    const name = profilesMap.get(senderId);
    if (name) return name;
    return senderType === "admin" ? "Administrador" : "Cliente";
  }

  /**
   * Obtém nome do remetente baseado no tipo (fallback)
   */
  private getSenderName(senderType: string): string {
    if (senderType === "admin") return "Administrador";
    if (senderType === "customer") return "Cliente";
    if (senderType === "system") return "Sistema";
    return "Remetente";
  }

  // =====================================================
  // GROUP BROADCAST METHODS
  // =====================================================

  /**
   * Sends a broadcast message to a group
   */
  async sendBroadcastMessage(
    groupId: string,
    senderId: string,
    message: string,
    richFields?: {
      action_button_text?: string;
      action_button_url?: string;
      link_text?: string;
      link_url?: string;
    },
    attachmentFiles?: File[]
  ): Promise<GroupMessage & { attachments: GroupAttachment[] }> {
    if (!message || message.trim().length < 1) {
      throw new Error("Mensagem não pode estar vazia");
    }
    if (message.length > 5000) {
      throw new Error("Mensagem não pode ter mais de 5000 caracteres");
    }

    const sanitizedMessage = sanitizeGroupMessage(message.trim());

    const { data: messageData, error: messageError } = await supportMessageRpc.rpc(
      "admin_send_chat_group_message",
      {
        p_group_id: groupId,
        p_message: sanitizedMessage,
        p_action_button_text: richFields?.action_button_text || null,
        p_action_button_url: richFields?.action_button_url || null,
        p_link_text: richFields?.link_text || null,
        p_link_url: richFields?.link_url || null,
      }
    );

    if (messageError || !messageData) {
      log.error("Failed to create group broadcast message", { error: messageError, groupId, senderId });
      throw new Error("Erro ao enviar mensagem");
    }

    let attachments: GroupAttachment[] = [];
    if (attachmentFiles && attachmentFiles.length > 0) {
      attachments = await this.uploadGroupAttachments(
        messageData.id,
        groupId,
        attachmentFiles,
        senderId
      );
    }

    return {
      ...messageData,
      attachments,
    };
  }

  /**
   * Uploads attachments for a group message
   */
  private async uploadGroupAttachments(
    messageId: string,
    groupId: string,
    files: File[],
    uploadedBy: string
  ): Promise<GroupAttachment[]> {
    const attachments: GroupAttachment[] = [];

    for (const file of files) {
      try {
        const validation = fileUploadService.validateFile(file);
        if (!validation.valid) {
          log.warn("Invalid group attachment skipped", { fileName: file.name, error: validation.error });
          continue;
        }

        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${groupId}/${timestamp}_${sanitizedFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("group-attachments")
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          log.error("Failed to upload group attachment", {
            error: uploadError,
            fileName: file.name,
            groupId,
          });
          continue;
        }

        const thumbnailPath: string | null = null;

        const { data: attachmentData, error: attachmentError } = await supportMessageRpc.rpc(
          "admin_register_chat_group_attachment",
          {
            p_message_id: messageId,
            p_uploaded_by: uploadedBy,
            p_file_name: file.name,
            p_file_path: filePath,
            p_file_size: file.size,
            p_file_type: file.type,
            p_thumbnail_path: thumbnailPath,
          }
        );

        if (attachmentError || !attachmentData) {
          await supabase.storage.from("group-attachments").remove([filePath]);
          log.error("Failed to register group attachment", {
            error: attachmentError,
            fileName: file.name,
            messageId,
          });
          continue;
        }

        attachments.push(attachmentData);
      } catch (error) {
        log.error("Failed to process group attachment", { error, fileName: file.name, messageId });
      }
    }

    return attachments;
  }

  /**
   * Lists messages for a group with pagination
   */
  async listGroupMessages(
    groupId: string,
    userIdOrPagination?: string | Pagination,
    paginationArg?: Pagination
  ): Promise<{
    messages: EnrichedGroupMessage[];
    hasMore: boolean;
    pagination: { page: number; limit: number; total: number; total_pages: number };
  }> {
    const pagination =
      typeof userIdOrPagination === "object" ? userIdOrPagination : paginationArg;
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("chat_group_messages")
      .select("*", { count: "exact" })
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      log.error("Failed to list group messages", { error, groupId });
      throw new Error("Erro ao carregar mensagens do grupo");
    }

    const messages = data || [];
    const total = count ?? messages.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const messageIds = messages.map((message) => message.id);
    const senderIds = [...new Set(messages.map((message) => message.sender_id))];

    let allAttachments: GroupAttachment[] = [];
    if (messageIds.length > 0) {
      const { data: attachments } = await supabase
        .from("chat_group_attachments")
        .select("*")
        .in("message_id", messageIds);

      allAttachments = attachments || [];
    }

    const attachmentsByMessage = new Map<string, GroupAttachment[]>();
    for (const attachment of allAttachments) {
      const existing = attachmentsByMessage.get(attachment.message_id) || [];
      existing.push(attachment);
      attachmentsByMessage.set(attachment.message_id, existing);
    }

    const profilesById = new Map<string, { name: string; avatar: string | null }>();
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", senderIds);

      for (const profile of profiles || []) {
        profilesById.set(profile.id, {
          name: profile.full_name || profile.email || "Usuario",
          avatar: profile.avatar_url || null,
        });
      }
    }

    const messagesWithAttachments: EnrichedGroupMessage[] = messages.map((message) => {
      const senderProfile = profilesById.get(message.sender_id);

      return {
        ...message,
        attachments: attachmentsByMessage.get(message.id) || [],
        sender_name: senderProfile?.name || "Admin",
        sender_avatar: senderProfile?.avatar ?? null,
      };
    });

    return {
      messages: messagesWithAttachments.reverse(),
      hasMore: page < totalPages,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    };
  }

  async updateLastViewed(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("chat_group_members")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) {
      log.error("Failed to update group last viewed timestamp", { error, groupId, userId });
      throw new Error("Erro ao atualizar visualizacao do grupo");
    }
  }

  /**
   * Deletes a group message (admin only)
   */
  async deleteGroupMessage(messageId: string): Promise<void> {
    const { error } = await supportMessageRpc.rpc("admin_delete_chat_group_message", {
      p_message_id: messageId,
    });

    if (error) {
      log.error("Failed to delete group message", { error, messageId });
      throw new Error("Erro ao deletar mensagem");
    }
  }

  /**
   * Edits a group message
   */
  async editGroupMessage(messageId: string, newMessage: string): Promise<GroupMessage> {
    if (!newMessage || newMessage.trim().length < 1) {
      throw new Error("Mensagem não pode estar vazia");
    }
    if (newMessage.length > 5000) {
      throw new Error("Mensagem não pode ter mais de 5000 caracteres");
    }

    const sanitizedMessage = sanitizeGroupMessage(newMessage.trim());

    const { data, error } = await supportMessageRpc.rpc("admin_edit_chat_group_message", {
      p_message_id: messageId,
      p_message: sanitizedMessage,
    });

    if (error || !data) {
      log.error("Failed to edit group message", { error, messageId });
      throw new Error("Erro ao editar mensagem");
    }

    return data;
  }
}

export const messageService = new MessageService();
