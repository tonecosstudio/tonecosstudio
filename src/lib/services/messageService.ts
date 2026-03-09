import { supabase } from "@/integrations/supabase/client";
import type { Message, SendMessageData, PaginationOptions } from "@/types/support";
import type { GroupMessage, GroupAttachment, Pagination } from "@/types/groups";
import { fileUploadService } from "./fileUploadService";
import { sanitizeGroupMessage, sanitizeText } from "@/lib/utils/sanitize";

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
      console.error("Erro ao listar mensagens:", error);
      throw new Error("Erro ao carregar mensagens");
    }

    // Buscar anexos separadamente
    const messages = data || [];
    const messageIds = messages.map((msg) => msg.id);

    // Batch fetch all attachments at once instead of per-message
    let allAttachments: any[] = [];
    if (messageIds.length > 0) {
      const { data: attachmentsData } = await supabase
        .from("support_attachments")
        .select("*")
        .in("message_id", messageIds);
      allAttachments = attachmentsData || [];
    }

    // Group attachments by message_id
    const attachmentsByMessage = new Map<string, any[]>();
    for (const att of allAttachments) {
      const existing = attachmentsByMessage.get(att.message_id) || [];
      existing.push(att);
      attachmentsByMessage.set(att.message_id, existing);
    }

    // Batch fetch sender profiles
    const senderIds = [...new Set(messages.map((msg) => msg.sender_id))];
    let profilesMap = new Map<string, string>();
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
      ...msg,
      sender_name: this.getSenderNameFromProfile(msg.sender_type, msg.sender_id, profilesMap),
      attachments: attachmentsByMessage.get(msg.id) || [],
      is_internal: msg.is_internal || false,
      read_by_admin: msg.read_by_admin || false,
      read_by_customer: msg.read_by_customer || false,
    }));
  }

  /**
   * Envia uma mensagem
   */
  async sendMessage(messageData: SendMessageData): Promise<Message> {
    const { data, error } = await supabase
      .from("support_messages")
      .insert({
        conversation_id: messageData.conversation_id,
        sender_id: messageData.sender_id,
        sender_type: messageData.sender_type,
        message: messageData.message,
        is_internal: messageData.is_internal || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao enviar mensagem:", error);
      throw new Error("Erro ao enviar mensagem");
    }

    // Se houver anexos, criar registros
    if (messageData.attachments && messageData.attachments.length > 0) {
      await this.createAttachments(data.id, messageData.sender_id, messageData.attachments);
    }

    // Se for mensagem do admin para cliente, enviar notificação por email
    if (messageData.sender_type === "admin" && !messageData.is_internal) {
      this.sendEmailNotification(data.id, messageData.conversation_id, messageData.message).catch(
        (err) => {
          console.error("Erro ao enviar notificação por email:", err);
        }
      );
    }

    return {
      ...data,
      sender_name: this.getSenderName(data.sender_type, data.sender_id),
      attachments: messageData.attachments || [],
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
    messageContent: string
  ): Promise<void> {
    try {
      const { data: conversation } = await supabase
        .from("support_conversations")
        .select("user_id")
        .eq("id", conversationId)
        .single();

      if (!conversation) return;

      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          conversationId,
          messageId,
          recipientUserId: conversation.user_id,
          messageContent,
        },
      });

      if (error) {
        console.error("Erro ao chamar Edge Function de email:", error);
      }
    } catch (error) {
      console.error("Erro ao enviar notificação por email:", error);
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
    const { data, error } = await supabase
      .from("support_messages")
      .update({
        message: newMessage,
        edited_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .eq("is_internal", true)
      .select()
      .single();

    if (error) {
      console.error("Erro ao editar nota interna:", error);
      throw new Error("Erro ao editar nota interna");
    }

    return {
      ...data,
      sender_name: this.getSenderName(data.sender_type, data.sender_id),
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
    const { error } = await supabase
      .from("support_messages")
      .delete()
      .eq("id", messageId)
      .eq("is_internal", true);

    if (error) {
      console.error("Erro ao deletar nota interna:", error);
      throw new Error("Erro ao deletar nota interna");
    }
  }

  /**
   * Marca mensagens como lidas
   */
  async markAsRead(messageIds: string[], readerType: "admin" | "customer"): Promise<void> {
    const updateField = readerType === "admin" ? "read_by_admin" : "read_by_customer";

    const { error } = await supabase
      .from("support_messages")
      .update({ [updateField]: true })
      .in("id", messageIds);

    if (error) {
      console.error("Erro ao marcar mensagens como lidas:", error);
      throw new Error("Erro ao marcar mensagens como lidas");
    }
  }

  /**
   * Deleta uma mensagem (soft delete)
   * Uses has_role function to check admin status
   */
  async deleteMessage(messageId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Check admin role using the has_role function
    const { data: hasAdminRole } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!hasAdminRole) {
      throw new Error("Apenas administradores podem deletar mensagens");
    }

    const { error } = await supabase
      .from("support_messages")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq("id", messageId);

    if (error) {
      console.error("Erro ao deletar mensagem:", error);
      throw new Error("Erro ao deletar mensagem");
    }
  }

  /**
   * Edita uma mensagem
   * Apenas o autor pode editar, dentro de 15 minutos
   */
  async editMessage(messageId: string, newMessage: string): Promise<Message> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const { data: message, error: fetchError } = await supabase
      .from("support_messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (fetchError || !message) {
      throw new Error("Mensagem não encontrada");
    }

    if (message.sender_id !== user.id) {
      throw new Error("Você só pode editar suas próprias mensagens");
    }

    if (message.deleted_at) {
      throw new Error("Não é possível editar mensagem deletada");
    }

    const messageTime = new Date(message.created_at).getTime();
    const now = Date.now();
    if (now - messageTime > 15 * 60 * 1000) {
      throw new Error("Mensagens só podem ser editadas dentro de 15 minutos");
    }

    const { data, error } = await supabase
      .from("support_messages")
      .update({
        message: newMessage,
        edited_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .select()
      .single();

    if (error) {
      console.error("Erro ao editar mensagem:", error);
      throw new Error("Erro ao editar mensagem");
    }

    return {
      ...data,
      sender_name: this.getSenderName(data.sender_type, data.sender_id),
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
    uploadedBy: string,
    attachments: Array<{
      file_name: string;
      file_path: string;
      file_size: number;
      file_type: string;
      thumbnail_path?: string;
    }>
  ): Promise<void> {
    const attachmentsData = attachments.map((attachment) => ({
      message_id: messageId,
      uploaded_by: uploadedBy,
      ...attachment,
    }));

    const { error } = await supabase.from("support_attachments").insert(attachmentsData);

    if (error) {
      console.error("Erro ao criar anexos:", error);
      throw new Error("Erro ao criar anexos");
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
  private getSenderName(senderType: string, senderId: string): string {
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

    const { data: group, error: groupError } = await supabase
      .from("chat_groups")
      .select("id, deleted_at")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      throw new Error("Grupo não encontrado");
    }

    if (group.deleted_at) {
      throw new Error("Não é possível enviar mensagens para um grupo deletado");
    }

    const { data: messageData, error: messageError } = await supabase
      .from("chat_group_messages")
      .insert({
        group_id: groupId,
        sender_id: senderId,
        message: sanitizedMessage,
        action_button_text: richFields?.action_button_text || null,
        action_button_url: richFields?.action_button_url || null,
        link_text: richFields?.link_text || null,
        link_url: richFields?.link_url || null,
      })
      .select()
      .single();

    if (messageError) {
      console.error("Erro ao criar mensagem de grupo:", messageError);
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
          console.error(`Arquivo inválido: ${file.name}`, validation.error);
          continue;
        }

        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `group-attachments/${groupId}/${timestamp}_${sanitizedFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("support-attachments")
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error(`Erro ao fazer upload do arquivo ${file.name}:`, uploadError);
          continue;
        }

        let thumbnailPath: string | null = null;

        const { data: attachmentData, error: attachmentError } = await supabase
          .from("chat_group_attachments")
          .insert({
            message_id: messageId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            thumbnail_path: thumbnailPath,
            uploaded_by: uploadedBy,
          })
          .select()
          .single();

        if (attachmentError) {
          console.error(`Erro ao registrar anexo ${file.name}:`, attachmentError);
          continue;
        }

        attachments.push(attachmentData);
      } catch (error) {
        console.error(`Erro ao processar arquivo ${file.name}:`, error);
      }
    }

    return attachments;
  }

  /**
   * Lists messages for a group with pagination
   */
  async listGroupMessages(
    groupId: string,
    pagination?: Pagination
  ): Promise<{ messages: (GroupMessage & { attachments: GroupAttachment[] })[]; hasMore: boolean }> {
    const limit = pagination?.limit || 50;
    const offset = pagination?.offset || 0;

    const { data, error } = await supabase
      .from("chat_group_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit);

    if (error) {
      console.error("Erro ao listar mensagens do grupo:", error);
      throw new Error("Erro ao carregar mensagens do grupo");
    }

    const messages = data || [];
    const hasMore = messages.length > limit;
    const trimmedMessages = hasMore ? messages.slice(0, limit) : messages;

    const messagesWithAttachments = await Promise.all(
      trimmedMessages.map(async (msg) => {
        const { data: attachments } = await supabase
          .from("chat_group_attachments")
          .select("*")
          .eq("message_id", msg.id);

        return {
          ...msg,
          attachments: attachments || [],
        };
      })
    );

    return {
      messages: messagesWithAttachments.reverse(),
      hasMore,
    };
  }

  /**
   * Deletes a group message (admin only)
   */
  async deleteGroupMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from("chat_group_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      console.error("Erro ao deletar mensagem do grupo:", error);
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

    const { data, error } = await supabase
      .from("chat_group_messages")
      .update({
        message: sanitizedMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .select()
      .single();

    if (error) {
      console.error("Erro ao editar mensagem do grupo:", error);
      throw new Error("Erro ao editar mensagem");
    }

    return data;
  }
}

export const messageService = new MessageService();
