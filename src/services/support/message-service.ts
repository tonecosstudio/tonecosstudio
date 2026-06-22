import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import {
  assertCurrentUserId,
  requireAuthenticatedUserId,
  requireCurrentUserAdminAccess,
} from "@/services/auth/current-user";
import {
  hydrateSupportMessages,
  normalizeSupportMessageResult,
  type SupportMessageRow,
} from "@/services/support/support-message-hydration-service";
import type {
  Attachment,
  Message,
  PaginationOptions,
  SendMessageData,
} from "@/types/support";
import type {
  GroupMessage,
  GroupAttachment,
  Pagination,
  EnrichedGroupMessage,
} from "@/types/groups";
import { fileUploadService } from "@/services/support/file-upload-service";
import { sanitizeGroupMessage } from "@/lib/utils/sanitize";
import { createGroupAttachmentSignedUrl } from "@/services/groups/group-attachment-storage-service";
import {
  removeStorageFiles,
  uploadStorageFile,
} from "@/services/supabase/storage-client";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";

interface SupportMessageRpcError {
  message: string;
}

interface SupportMessageRpcClient {
  rpc(
    name: "send_support_message",
    args: {
      p_conversation_id: string;
      p_sender_type: SendMessageData["sender_type"];
      p_message: string;
      p_is_internal: boolean;
    },
  ): Promise<{ data: Message | null; error: SupportMessageRpcError | null }>;
  rpc(
    name: "edit_support_message",
    args: { p_message_id: string; p_message: string },
  ): Promise<{ data: Message | null; error: SupportMessageRpcError | null }>;
  rpc(
    name: "admin_edit_internal_support_note",
    args: { p_message_id: string; p_message: string },
  ): Promise<{ data: Message | null; error: SupportMessageRpcError | null }>;
  rpc(
    name: "admin_delete_support_message",
    args: { p_message_id: string },
  ): Promise<{ data: string | null; error: SupportMessageRpcError | null }>;
  rpc(
    name: "admin_delete_internal_support_note",
    args: { p_message_id: string },
  ): Promise<{ data: string | null; error: SupportMessageRpcError | null }>;
  rpc(
    name: "mark_support_messages_read",
    args: { p_message_ids: string[]; p_reader_type: "admin" | "customer" },
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
    },
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
    },
  ): Promise<{
    data: GroupMessage | null;
    error: SupportMessageRpcError | null;
  }>;
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
    },
  ): Promise<{
    data: GroupAttachment | null;
    error: SupportMessageRpcError | null;
  }>;
  rpc(
    name: "admin_edit_chat_group_message",
    args: { p_message_id: string; p_message: string },
  ): Promise<{
    data: GroupMessage | null;
    error: SupportMessageRpcError | null;
  }>;
  rpc(
    name: "admin_delete_chat_group_message",
    args: { p_message_id: string },
  ): Promise<{ data: string | null; error: SupportMessageRpcError | null }>;
}

const supportMessageRpc = supabase as unknown as SupportMessageRpcClient;

export class MessageService {
  private async attachGroupAccessUrl(
    attachment: GroupAttachment,
  ): Promise<GroupAttachment> {
    try {
      return {
        ...attachment,
        access_url: await createGroupAttachmentSignedUrl(attachment.file_path),
      };
    } catch (error) {
      log.warn("Failed to create signed group attachment URL", {
        error,
        attachmentId: attachment.id,
      });

      return {
        ...attachment,
        access_url: null,
      };
    }
  }

  private async attachGroupAccessUrls(
    attachments: GroupAttachment[],
  ): Promise<GroupAttachment[]> {
    return Promise.all(
      attachments.map((attachment) => this.attachGroupAccessUrl(attachment)),
    );
  }

  /**
   * Lista mensagens de uma conversa
   */
  async listMessages(
    conversationId: string,
    options?: PaginationOptions,
  ): Promise<Message[]> {
    await requireCurrentUserAdminAccess();

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

    const messages = (data || []) as unknown as SupportMessageRow[];
    return hydrateSupportMessages(messages);
  }

  /**
   * Envia uma mensagem
   */
  async sendMessage(messageData: SendMessageData): Promise<Message> {
    if (messageData.sender_type === "system") {
      throw new Error("Mensagens de sistema devem ser criadas no backend");
    }

    if (messageData.sender_type === "admin") {
      const adminId = await requireCurrentUserAdminAccess();
      if (messageData.sender_id !== adminId) {
        throw new Error("Acesso negado ao administrador informado");
      }
    } else {
      await assertCurrentUserId(messageData.sender_id);
    }

    const { data, error } = await supportMessageRpc.rpc(
      "send_support_message",
      {
        p_conversation_id: messageData.conversation_id,
        p_sender_type: messageData.sender_type,
        p_message: messageData.message,
        p_is_internal: messageData.is_internal || false,
      },
    );

    if (error || !data) {
      log.error("Failed to send support message", {
        error,
        conversationId: messageData.conversation_id,
        senderId: messageData.sender_id,
      });
      throw new Error("Erro ao enviar mensagem");
    }

    if (messageData.attachments && messageData.attachments.length > 0) {
      await this.createAttachments(
        data.id,
        messageData.conversation_id,
        messageData.sender_id,
        messageData.attachments,
      );
    }

    if (messageData.sender_type === "admin" && !messageData.is_internal) {
      this.sendEmailNotification(
        data.id,
        messageData.conversation_id,
        messageData.sender_id,
        messageData.message,
      ).catch((sendEmailError) => {
        log.error("Failed to enqueue support email notification", {
          error: sendEmailError,
          messageId: data.id,
          conversationId: messageData.conversation_id,
        });
      });
    }

    return normalizeSupportMessageResult(data);
  }

  async sendCurrentAdminMessage(
    conversationId: string,
    message: string,
    isInternal: boolean = false,
  ): Promise<Message> {
    const userId = await requireCurrentUserAdminAccess();

    return this.sendMessage({
      conversation_id: conversationId,
      sender_id: userId,
      sender_type: "admin",
      message,
      is_internal: isInternal,
    });
  }

  /**
   * Envia notificacao por email via Edge Function
   */
  private async sendEmailNotification(
    messageId: string,
    conversationId: string,
    senderId: string,
    messageContent: string,
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

      await callAuthenticatedEdgeFunction(
        "send-email",
        {
          conversationId,
          messageId,
          recipientUserId: conversation.user_id,
          messageContent,
        },
        "Failed to invoke support email Edge Function",
      );
    } catch (error) {
      log.error("Failed to send support email notification", {
        error,
        messageId,
        conversationId,
      });
    }
  }

  /**
   * Adiciona uma nota interna
   */
  async addInternalNote(
    conversationId: string,
    senderId: string,
    message: string,
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
   * Edita uma nota interna
   */
  async editInternalNote(
    messageId: string,
    newMessage: string,
  ): Promise<Message> {
    await requireCurrentUserAdminAccess();

    const data = await callAdminRpc<Message | null>(
      "admin_edit_internal_support_note",
      {
        p_message_id: messageId,
        p_message: newMessage,
      },
    );

    if (!data) {
      log.error("Failed to edit internal support note", { messageId });
      throw new Error("Erro ao editar nota interna");
    }

    return normalizeSupportMessageResult(data);
  }

  /**
   * Deleta uma nota interna
   */
  async deleteInternalNote(messageId: string): Promise<void> {
    await requireCurrentUserAdminAccess();

    try {
      await callAdminRpc(
        "admin_delete_internal_support_note",
        {
        p_message_id: messageId,
        },
      );
    } catch (error) {
      log.error("Failed to delete internal support note", { error, messageId });
      throw new Error("Erro ao deletar nota interna");
    }
  }

  /**
   * Marca mensagens como lidas
   */
  async markAsRead(
    messageIds: string[],
    readerType: "admin" | "customer",
  ): Promise<void> {
    if (readerType === "admin") {
      await requireCurrentUserAdminAccess();
    } else {
      await requireAuthenticatedUserId();
    }

    const { error } = await supportMessageRpc.rpc(
      "mark_support_messages_read",
      {
        p_message_ids: messageIds,
        p_reader_type: readerType,
      },
    );

    if (error) {
      log.error("Failed to mark support messages as read", {
        error,
        messageIds,
        readerType,
      });
      throw new Error("Erro ao marcar mensagens como lidas");
    }
  }

  async listUnreadCustomerMessageIds(
    conversationId: string,
  ): Promise<string[]> {
    await requireCurrentUserAdminAccess();

    const { data: unreadMessages, error } = await supabase
      .from("support_messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("read_by_admin", false)
      .eq("sender_type", "customer");

    if (error) {
      log.error("Erro ao buscar mensagens nao lidas", {
        error,
        conversationId,
      });
      return [];
    }

    return (unreadMessages || [])
      .map((message) => message.id)
      .filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
      );
  }

  /**
   * Deleta uma mensagem
   */
  async deleteMessage(messageId: string): Promise<void> {
    await requireCurrentUserAdminAccess();

    try {
      await callAdminRpc(
        "admin_delete_support_message",
        {
        p_message_id: messageId,
        },
      );
    } catch (error) {
      log.error("Failed to delete support message", { error, messageId });
      throw new Error("Erro ao deletar mensagem");
    }
  }

  /**
   * Edita uma mensagem
   */
  async editMessage(messageId: string, newMessage: string): Promise<Message> {
    await requireCurrentUserAdminAccess();

    const { data, error } = await supportMessageRpc.rpc(
      "edit_support_message",
      {
        p_message_id: messageId,
        p_message: newMessage,
      },
    );

    if (error || !data) {
      log.error("Failed to edit support message", { error, messageId });
      throw new Error("Erro ao editar mensagem");
    }

    return normalizeSupportMessageResult(data);
  }

  /**
   * Cria anexos para uma mensagem
   */
  private async createAttachments(
    messageId: string,
    conversationId: string,
    uploadedBy: string,
    attachments: File[],
  ): Promise<void> {
    for (const attachment of attachments) {
      await fileUploadService.uploadFile(
        attachment,
        conversationId,
        messageId,
        uploadedBy,
      );
    }
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
    attachmentFiles?: File[],
  ): Promise<GroupMessage & { attachments: GroupAttachment[] }> {
    const adminId = await requireCurrentUserAdminAccess();
    if (senderId !== adminId) {
      throw new Error("Acesso negado ao administrador informado");
    }

    if (!message || message.trim().length < 1) {
      throw new Error("Mensagem não pode estar vazia");
    }
    if (message.length > 5000) {
      throw new Error("Mensagem não pode ter mais de 5000 caracteres");
    }

    const sanitizedMessage = sanitizeGroupMessage(message.trim());

    const messageData = await callAdminRpc<GroupMessage | null>("admin_send_chat_group_message", {
        p_group_id: groupId,
        p_message: sanitizedMessage,
        p_action_button_text: richFields?.action_button_text || null,
        p_action_button_url: richFields?.action_button_url || null,
        p_link_text: richFields?.link_text || null,
        p_link_url: richFields?.link_url || null,
      });

    if (!messageData) {
      log.error("Failed to create group broadcast message", {
        groupId,
        senderId,
      });
      throw new Error("Erro ao enviar mensagem");
    }

    let attachments: GroupAttachment[] = [];
    if (attachmentFiles && attachmentFiles.length > 0) {
      attachments = await this.uploadGroupAttachments(
        messageData.id,
        groupId,
        attachmentFiles,
        senderId,
      );
    }

    return {
      ...messageData,
      attachments,
    };
  }

  async sendCurrentAdminBroadcastMessage(
    groupId: string,
    message: string,
    attachmentFiles?: File[],
  ): Promise<EnrichedGroupMessage> {
    const userId = await requireCurrentUserAdminAccess();

    const result = await this.sendBroadcastMessage(
      groupId,
      userId,
      message,
      undefined,
      attachmentFiles,
    );

    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("id", userId)
      .single();

    const enrichedMessage: EnrichedGroupMessage = {
      ...result,
      sender_name: senderProfile?.full_name || senderProfile?.email || "Admin",
      sender_avatar: senderProfile?.avatar_url || null,
    };

    const { broadcastGroupMessage } =
      await import("@/services/groups/group-broadcast-service");
    await broadcastGroupMessage(groupId, enrichedMessage);

    return enrichedMessage;
  }

  /**
   * Uploads attachments for a group message
   */
  private async uploadGroupAttachments(
    messageId: string,
    groupId: string,
    files: File[],
    uploadedBy: string,
  ): Promise<GroupAttachment[]> {
    const attachments: GroupAttachment[] = [];

    for (const file of files) {
      try {
        const validation = fileUploadService.validateFile(file);
        if (!validation.valid) {
          log.warn("Invalid group attachment skipped", {
            fileName: file.name,
            error: validation.error,
          });
          continue;
        }

        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${groupId}/${timestamp}_${sanitizedFileName}`;

        const { error: uploadError } = await uploadStorageFile(
          "group-attachments",
          filePath,
          file,
          {
            contentType: file.type,
            upsert: false,
          },
        );

        if (uploadError) {
          log.error("Failed to upload group attachment", {
            error: uploadError,
            fileName: file.name,
            groupId,
          });
          continue;
        }

        const thumbnailPath: string | null = null;

        const attachmentData =
          await callAdminRpc<GroupAttachment | null>("admin_register_chat_group_attachment", {
            p_message_id: messageId,
            p_uploaded_by: uploadedBy,
            p_file_name: file.name,
            p_file_path: filePath,
            p_file_size: file.size,
            p_file_type: file.type,
            p_thumbnail_path: thumbnailPath,
          });

        if (!attachmentData) {
          await removeStorageFiles("group-attachments", [filePath]);
          log.error("Failed to register group attachment", {
            fileName: file.name,
            messageId,
          });
          continue;
        }

        attachments.push(await this.attachGroupAccessUrl(attachmentData));
      } catch (error) {
        log.error("Failed to process group attachment", {
          error,
          fileName: file.name,
          messageId,
        });
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
    paginationArg?: Pagination,
  ): Promise<{
    messages: EnrichedGroupMessage[];
    hasMore: boolean;
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }> {
    if (typeof userIdOrPagination === "string") {
      await assertCurrentUserId(userIdOrPagination);
    } else {
      await requireAuthenticatedUserId();
    }

    const pagination =
      typeof userIdOrPagination === "object"
        ? userIdOrPagination
        : paginationArg;
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
    const senderIds = [
      ...new Set(messages.map((message) => message.sender_id)),
    ];

    let allAttachments: GroupAttachment[] = [];
    if (messageIds.length > 0) {
      const { data: attachments } = await supabase
        .from("chat_group_attachments")
        .select("*")
        .in("message_id", messageIds);

      allAttachments = await this.attachGroupAccessUrls(attachments || []);
    }

    const attachmentsByMessage = new Map<string, GroupAttachment[]>();
    for (const attachment of allAttachments) {
      const existing = attachmentsByMessage.get(attachment.message_id) || [];
      existing.push(attachment);
      attachmentsByMessage.set(attachment.message_id, existing);
    }

    const profilesById = new Map<
      string,
      { name: string; avatar: string | null }
    >();
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

    const messagesWithAttachments: EnrichedGroupMessage[] = messages.map(
      (message) => {
        const senderProfile = profilesById.get(message.sender_id);

        return {
          ...message,
          attachments: attachmentsByMessage.get(message.id) || [],
          sender_name: senderProfile?.name || "Admin",
          sender_avatar: senderProfile?.avatar ?? null,
        };
      },
    );

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

  async listCurrentUserGroupMessages(
    groupId: string,
    pagination?: Pagination,
  ): Promise<{
    messages: EnrichedGroupMessage[];
    hasMore: boolean;
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }> {
    const userId = await requireAuthenticatedUserId();
    return this.listGroupMessages(groupId, userId, pagination);
  }

  async updateLastViewed(groupId: string, userId: string): Promise<void> {
    await assertCurrentUserId(userId);

    const { error } = await supabase
      .from("chat_group_members")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) {
      log.error("Failed to update group last viewed timestamp", {
        error,
        groupId,
        userId,
      });
      throw new Error("Erro ao atualizar visualizacao do grupo");
    }
  }

  async updateCurrentUserLastViewed(groupId: string): Promise<string> {
    const userId = await requireAuthenticatedUserId();
    await this.updateLastViewed(groupId, userId);
    return userId;
  }

  /**
   * Deletes a group message (admin only)
   */
  async deleteGroupMessage(messageId: string): Promise<void> {
    await requireCurrentUserAdminAccess();

    try {
      await callAdminRpc(
        "admin_delete_chat_group_message",
        {
        p_message_id: messageId,
        },
      );
    } catch (error) {
      log.error("Failed to delete group message", { error, messageId });
      throw new Error("Erro ao deletar mensagem");
    }
  }

  /**
   * Edits a group message
   */
  async editGroupMessage(
    messageId: string,
    newMessage: string,
  ): Promise<GroupMessage> {
    await requireCurrentUserAdminAccess();

    if (!newMessage || newMessage.trim().length < 1) {
      throw new Error("Mensagem não pode estar vazia");
    }
    if (newMessage.length > 5000) {
      throw new Error("Mensagem não pode ter mais de 5000 caracteres");
    }

    const sanitizedMessage = sanitizeGroupMessage(newMessage.trim());

    const data = await callAdminRpc<GroupMessage | null>(
      "admin_edit_chat_group_message",
      {
        p_message_id: messageId,
        p_message: sanitizedMessage,
      },
    );

    if (!data) {
      log.error("Failed to edit group message", { messageId });
      throw new Error("Erro ao editar mensagem");
    }

    return data;
  }
}

export const messageService = new MessageService();
