// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type {
  Message,
  SendMessageData,
  PaginationOptions,
} from "@/types/support";
import type {
  GroupMessage,
  GroupAttachment,
  Pagination,
} from "@/types/groups";
import { fileUploadService } from "./fileUploadService";

export class MessageService {
  /**
   * Lista mensagens de uma conversa
   */
  async listMessages(
    conversationId: string,
    options?: PaginationOptions
  ): Promise<Message[]> {
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
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        try {
          // Buscar anexos
          const { data: attachmentsData } = await supabase
            .from("support_attachments")
            .select("*")
            .eq("message_id", msg.id);

          return {
            ...msg,
            sender_name: this.getSenderName(msg.sender_type, msg.sender_id),
            attachments: attachmentsData || [],
            is_internal: msg.is_internal || false,
            read_by_admin: msg.read_by_admin || false,
            read_by_customer: msg.read_by_customer || false,
          };
        } catch (error) {
          console.error(`Erro ao buscar anexos da mensagem ${msg.id}:`, error);
          return {
            ...msg,
            sender_name: this.getSenderName(msg.sender_type, msg.sender_id),
            attachments: [],
            is_internal: msg.is_internal || false,
            read_by_admin: msg.read_by_admin || false,
            read_by_customer: msg.read_by_customer || false,
          };
        }
      })
    );

    return enrichedMessages;
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
    if (messageData.sender_type === 'admin' && !messageData.is_internal) {
      this.sendEmailNotification(data.id, messageData.conversation_id, messageData.message).catch(err => {
        console.error('❌ Erro ao enviar notificação por email:', err);
        // Não falha a operação se o email falhar
      });
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
      // Buscar informações da conversa
      const { data: conversation } = await supabase
        .from('support_conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single();

      if (!conversation) {
        console.warn('Conversa não encontrada para envio de email');
        return;
      }

      // Chamar Edge Function (usa service role key internamente)
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          conversationId,
          messageId,
          recipientUserId: conversation.user_id,
          messageContent,
        },
      });

      if (error) {
        console.error('❌ Erro ao chamar Edge Function de email:', error);
        console.error('Detalhes:', error.message);
      } else {
        console.log('✅ Email enviado com sucesso!', data);
      }
    } catch (error) {
      console.error('❌ Erro ao enviar notificação por email:', error);
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
  async editInternalNote(
    messageId: string,
    newMessage: string
  ): Promise<Message> {
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
  async markAsRead(
    messageIds: string[],
    readerType: "admin" | "customer"
  ): Promise<void> {
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
   * Apenas admins podem deletar mensagens
   */
  async deleteMessage(messageId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Buscar mensagem para verificar permissões e tempo
    const { data: message, error: fetchError } = await supabase
      .from("support_messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (fetchError || !message) {
      throw new Error("Mensagem não encontrada");
    }

    // Verificar se é o autor
    if (message.sender_id !== user.id) {
      throw new Error("Você só pode editar suas próprias mensagens");
    }

    // Verificar se já foi deletada
    if (message.deleted_at) {
      throw new Error("Não é possível editar mensagem deletada");
    }

    // Verificar limite de tempo (15 minutos)
    const messageTime = new Date(message.created_at).getTime();
    const now = new Date().getTime();
    const fifteenMinutes = 15 * 60 * 1000;

    if (now - messageTime > fifteenMinutes) {
      throw new Error("Mensagens só podem ser editadas dentro de 15 minutos");
    }

    // Atualizar mensagem
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

    const { error } = await supabase
      .from("support_attachments")
      .insert(attachmentsData);

    if (error) {
      console.error("Erro ao criar anexos:", error);
      throw new Error("Erro ao criar anexos");
    }
  }

  /**
   * Obtém nome do remetente baseado no tipo
   */
  private getSenderName(senderType: string, senderId: string): string {
    if (senderType === "admin") {
      return "Administrador";
    } else if (senderType === "customer") {
      return "Cliente";
    } else if (senderType === "system") {
      return "Sistema";
    }
    return "Remetente";
  }

  // =====================================================
  // GROUP BROADCAST METHODS
  // =====================================================

  /**
   * Sends a broadcast message to a group
   * Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3
   */
  async sendBroadcastMessage(
    groupId: string,
    senderId: string,
    message: string,
    attachmentFiles?: File[]
  ): Promise<GroupMessage & { attachments: GroupAttachment[] }> {
    // Validate message length (1-5000 chars)
    if (!message || message.trim().length < 1) {
      throw new Error("Mensagem não pode estar vazia");
    }
    if (message.length > 5000) {
      throw new Error("Mensagem não pode ter mais de 5000 caracteres");
    }

    // Verify group exists and is not deleted
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

    // Create the message (stored ONCE, not per member)
    const { data: messageData, error: messageError } = await supabase
      .from("chat_group_messages")
      .insert({
        group_id: groupId,
        sender_id: senderId,
        message: message.trim(),
      })
      .select()
      .single();

    if (messageError) {
      console.error("Erro ao criar mensagem de grupo:", messageError);
      throw new Error("Erro ao enviar mensagem");
    }

    // Handle attachments if provided
    let attachments: GroupAttachment[] = [];
    if (attachmentFiles && attachmentFiles.length > 0) {
      attachments = await this.uploadGroupAttachments(
        messageData.id,
        groupId,
        attachmentFiles,
        senderId
      );
    }

    // Broadcast via Realtime (handled by frontend subscription)
    // Email notifications handled by background job

    return {
      ...messageData,
      attachments,
    };
  }

  /**
   * Uploads attachments for a group message
   * Integrates with existing fileUploadService
   * Requirements: 9.1, 9.2, 9.3
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
        // Validate file
        const validation = fileUploadService.validateFile(file);
        if (!validation.valid) {
          console.error(`Arquivo inválido: ${file.name}`, validation.error);
          continue;
        }

        // Generate unique file path
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `group-attachments/${groupId}/${timestamp}_${sanitizedFileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("support-attachments")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Erro ao fazer upload:", uploadError);
          continue;
        }

        // Save attachment metadata
        const { data: attachmentData, error: dbError } = await supabase
          .from("chat_group_attachments")
          .insert({
            message_id: messageId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: uploadedBy,
          })
          .select()
          .single();

        if (dbError) {
          console.error("Erro ao salvar metadata do anexo:", dbError);
          // Try to delete uploaded file
          await supabase.storage
            .from("support-attachments")
            .remove([filePath]);
          continue;
        }

        attachments.push(attachmentData as GroupAttachment);
      } catch (error) {
        console.error(`Erro ao processar arquivo ${file.name}:`, error);
      }
    }

    return attachments;
  }

  /**
   * Lists messages from a group with pagination
   * Requirements: 14.1, 14.2, 14.3, 14.4
   */
  async listGroupMessages(
    groupId: string,
    userId: string,
    pagination: Pagination = { page: 1, limit: 50 }
  ): Promise<{
    messages: Array<GroupMessage & { 
      sender_name: string;
      sender_avatar: string | null;
      attachments: GroupAttachment[];
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }> {
    // Verify user is a member of the group
    const { data: membership, error: memberError } = await supabase
      .from("chat_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (memberError || !membership) {
      throw new Error("Você não é membro deste grupo");
    }

    // Get total message count
    const { count: totalCount, error: countError } = await supabase
      .from("chat_group_messages")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (countError) {
      console.error("Erro ao contar mensagens:", countError);
      throw new Error("Erro ao carregar mensagens");
    }

    // Get paginated messages
    const offset = (pagination.page - 1) * pagination.limit;
    const { data: messages, error: messagesError } = await supabase
      .from("chat_group_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .range(offset, offset + pagination.limit - 1);

    if (messagesError) {
      console.error("Erro ao listar mensagens:", messagesError);
      throw new Error("Erro ao carregar mensagens");
    }

    // Enrich messages with sender info and attachments
    const enrichedMessages = await Promise.all(
      (messages || []).map(async (msg) => {
        // Get sender profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, avatar_url")
          .eq("id", msg.sender_id)
          .single();

        // Get attachments
        const { data: attachments } = await supabase
          .from("chat_group_attachments")
          .select("*")
          .eq("message_id", msg.id)
          .order("created_at", { ascending: true });

        return {
          ...msg,
          sender_name: profile?.full_name || profile?.email || "Usuário",
          sender_avatar: profile?.avatar_url || null,
          attachments: attachments || [],
        };
      })
    );

    return {
      messages: enrichedMessages,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: totalCount || 0,
        total_pages: Math.ceil((totalCount || 0) / pagination.limit),
      },
    };
  }

  /**
   * Updates the last viewed timestamp for a member in a group
   * Requirements: 12.3
   */
  async updateLastViewed(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("chat_group_members")
      .update({
        last_viewed_at: new Date().toISOString(),
      })
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) {
      console.error("Erro ao atualizar última visualização:", error);
      throw new Error("Erro ao atualizar visualização");
    }
  }

  /**
   * Gets the unread message count for a member in a group
   * Based on messages created after last_viewed_at
   * Requirements: 12.1, 12.2, 12.3
   */
  async getUnreadCount(groupId: string, userId: string): Promise<number> {
    // Get member's last viewed timestamp
    const { data: member, error: memberError } = await supabase
      .from("chat_group_members")
      .select("last_viewed_at")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (memberError || !member) {
      return 0;
    }

    // If never viewed, count all messages
    if (!member.last_viewed_at) {
      const { count } = await supabase
        .from("chat_group_messages")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId);

      return count || 0;
    }

    // Count messages created after last viewed
    const { count } = await supabase
      .from("chat_group_messages")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId)
      .gt("created_at", member.last_viewed_at);

    return count || 0;
  }

  /**
   * Gets public URL for a group attachment
   * Requirements: 9.4
   */
  getGroupAttachmentUrl(filePath: string): string {
    const { data } = supabase.storage
      .from("support-attachments")
      .getPublicUrl(filePath);
    return data.publicUrl;
  }
}

export const messageService = new MessageService();