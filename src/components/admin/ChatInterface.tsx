// @ts-nocheck
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Lock, FileText, Download, Trash2, Edit2, Check, X } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { QuickRepliesSelector } from "@/components/admin/QuickRepliesSelector";
import { ChatHeader } from "@/components/admin/ChatHeader";
import { AttachmentUpload } from "@/components/chat/AttachmentUpload";
import { toast } from "sonner";
import { validateMessage } from "@/lib/validations/support";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { conversationService } from "@/lib/services/conversationService";
import { messageService } from "@/lib/services/messageService";
import { fileUploadService } from "@/lib/services/fileUploadService";
import { supabase } from "@/integrations/supabase/client";
import { useSanitizedInput } from "@/hooks/useSanitizedInput";
import { sanitizeURL } from "@/lib/security/input-sanitizer";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limiter";
import type { Message, Conversation } from "@/types/support";

interface ChatInterfaceProps {
  conversationId: string;
  onOpenUserSidebar?: (userId: string) => void;
}

export function ChatInterface({ conversationId, onOpenUserSidebar }: ChatInterfaceProps) {
  const {
    messages,
    loading,
    hasMore,
    loadMore,
    messagesEndRef,
    optimisticAttachments,
    addOptimisticAttachment,
    updateOptimisticAttachment,
  } = useMessages({ conversationId, autoScroll: true });

  const [newMessageRaw, setNewMessageRaw, newMessageSanitized] = useSanitizedInput("", "text");
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Get current user for typing indicator
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        setCurrentUser({
          id: user.id,
          name: profile?.full_name || user.email || "Admin",
        });
      }
    };
    getUser();
  }, []);

  // Typing indicator
  const { typingText, startTyping, stopTyping } = useTypingIndicator({
    conversationId,
    currentUserId: currentUser?.id || "",
    currentUserName: currentUser?.name || "Admin",
  });

  // Carregar dados da conversa
  useEffect(() => {
    const loadConversation = async () => {
      try {
        const conv = await conversationService.getConversation(conversationId);
        setConversation(conv);
      } catch (error) {
        console.error("Erro ao carregar conversa:", error);
      }
    };
    loadConversation();
  }, [conversationId]);

  const handleSend = async () => {
    // Check rate limit (60 messages/minute for chat)
    const rateLimit = checkRateLimit(`chat-${conversationId}`, { maxRequests: 60, windowMs: 60000 });
    if (!rateLimit.allowed) {
      toast.error(`Limite de mensagens excedido. Aguarde ${rateLimit.retryAfter} segundos.`);
      return;
    }
    
    // Precisa ter mensagem ou anexos
    if (!newMessageSanitized.trim() && !selectedFiles.length) {
      toast.error("Digite uma mensagem ou anexe um arquivo");
      return;
    }

    // Validar mensagem se houver texto
    if (newMessageSanitized.trim()) {
      const validation = validateMessage(newMessageSanitized);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
      
      // Sanitize URLs in the message
      try {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = newMessageSanitized.match(urlRegex);
        if (urls) {
          for (const url of urls) {
            sanitizeURL(url); // This will throw if URL is invalid
          }
        }
      } catch (error) {
        toast.error("A mensagem contém URLs inválidas");
        return;
      }
    }

    try {
      setIsSending(true);
      setIsUploading(selectedFiles.length > 0);

      // Stop typing indicator immediately
      stopTyping();

      console.log("Iniciando envio de mensagem...");

      // Obter usuário atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      console.log("Usuário autenticado:", user.id);

      // Texto da mensagem (se vazio e houver anexos, usar placeholder)
      const messageText = newMessageSanitized.trim() || (selectedFiles.length > 0 ? "(anexo)" : "");

      // Enviar mensagem diretamente via messageService para obter o ID
      const messageData = await messageService.sendMessage({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_type: "admin",
        message: messageText,
        is_internal: isInternal,
      });

      console.log("Mensagem criada:", messageData);

      // Limpar input imediatamente
      setNewMessageRaw("");
      setIsInternal(false);
      const filesToUpload = [...selectedFiles];
      setSelectedFiles([]);

      // Upload de anexos com optimistic updates
      if (filesToUpload.length > 0 && addOptimisticAttachment && updateOptimisticAttachment) {
        console.log(
          `Fazendo upload de ${filesToUpload.length} arquivo(s) com optimistic updates...`
        );

        for (let i = 0; i < filesToUpload.length; i++) {
          const file = filesToUpload[i];
          const tempId = addOptimisticAttachment(messageData.id, file);

          try {
            console.log(`Uploading arquivo ${i + 1}/${filesToUpload.length}: ${file.name}`);
            const result = await fileUploadService.uploadFile(
              file,
              conversationId,
              messageData.id,
              user.id,
              (progress) => {
                updateOptimisticAttachment(messageData.id, tempId, { progress });
              }
            );

            console.log(`Arquivo ${file.name} enviado com sucesso`);
            updateOptimisticAttachment(messageData.id, tempId, {
              status: "uploaded",
              url: result.url,
            });
          } catch (error) {
            console.error("Erro ao fazer upload do arquivo:", error);
            updateOptimisticAttachment(messageData.id, tempId, {
              status: "error",
              error: error instanceof Error ? error.message : "Erro desconhecido",
            });
            toast.error(`Erro ao enviar ${file.name}`);
          }
        }
      } else if (filesToUpload.length > 0) {
        // Fallback sem optimistic updates
        console.log(`Fazendo upload de ${filesToUpload.length} arquivo(s)...`);
        for (const file of filesToUpload) {
          try {
            await fileUploadService.uploadFile(file, conversationId, messageData.id, user.id);
          } catch (error) {
            console.error("Erro ao fazer upload do arquivo:", error);
            toast.error(`Erro ao enviar ${file.name}`);
          }
        }
      }

      console.log("Mensagem enviada com sucesso!");
      toast.success("Mensagem enviada");
    } catch (error) {
      console.error("Erro completo ao enviar mensagem:", error);
      toast.error(`Erro ao enviar mensagem: ${error.message || "Erro desconhecido"}`);
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Tem certeza que deseja deletar esta mensagem?")) {
      return;
    }

    try {
      await messageService.deleteMessage(messageId);
      toast.success("Mensagem deletada");
    } catch (error) {
      console.error("Erro ao deletar mensagem:", error);
      toast.error(error.message || "Erro ao deletar mensagem");
    }
  };

  const handleStartEdit = (messageId: string, currentText: string) => {
    setEditingMessageId(messageId);
    setEditingText(currentText);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editingText.trim()) {
      toast.error("Mensagem não pode estar vazia");
      return;
    }

    try {
      await messageService.editMessage(messageId, editingText.trim());
      toast.success("Mensagem editada");
      setEditingMessageId(null);
      setEditingText("");
    } catch (error) {
      console.error("Erro ao editar mensagem:", error);
      toast.error(error.message || "Erro ao editar mensagem");
    }
  };

  const reloadConversation = async () => {
    try {
      const conv = await conversationService.getConversation(conversationId);
      setConversation(conv);
    } catch (error) {
      console.error("Erro ao recarregar conversa:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReplySelect = (message: string) => {
    setNewMessageRaw(message);
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return timestamp;
    }
  };

  const isClosed = conversation?.status === "closed";

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <ChatHeader
        conversationId={conversationId}
        conversation={conversation || undefined}
        onUserClick={onOpenUserSidebar}
        onConversationUpdate={reloadConversation}
        onToggleSidebar={() => {
          if (conversation?.user_id && onOpenUserSidebar) {
            onOpenUserSidebar(conversation.user_id);
          }
        }}
      />

      {/* Closed Conversation Banner */}
      {isClosed && (
        <div className="bg-muted border-b border-border p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Atendimento Encerrado</span>
              <span className="text-muted-foreground">
                - Esta conversa foi encerrada e não aceita mais mensagens
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await conversationService.updateStatus(conversationId, "waiting_admin");
                  await reloadConversation();
                  toast.success("Conversa reaberta com sucesso");
                } catch (error) {
                  console.error("Erro ao reabrir conversa:", error);
                  toast.error("Erro ao reabrir conversa");
                }
              }}
            >
              Reabrir Conversa
            </Button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Load More Button */}
        {hasMore && (
          <div className="text-center">
            <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
              {loading ? "Carregando..." : "Carregar mensagens antigas"}
            </Button>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            formatTimestamp={formatTimestamp}
            onDelete={handleDeleteMessage}
            onEdit={handleStartEdit}
            isEditing={editingMessageId === message.id}
            editingText={editingText}
            onEditTextChange={setEditingText}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
          />
        ))}

        {/* Empty state */}
        {!loading && messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma mensagem ainda. Envie a primeira mensagem!
          </div>
        )}

        {/* Typing indicator */}
        <TypingIndicator typingText={typingText} />

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t p-4 space-y-3">
        {isClosed ? (
          /* Closed conversation message */
          <div className="text-center py-6 text-muted-foreground">
            <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Atendimento Encerrado</p>
            <p className="text-sm mt-1 mb-4">
              Esta conversa foi encerrada e não aceita mais mensagens.
            </p>
            <Button
              variant="default"
              onClick={async () => {
                try {
                  await conversationService.updateStatus(conversationId, "waiting_admin");
                  await reloadConversation();
                  toast.success("Conversa reaberta com sucesso");
                } catch (error) {
                  console.error("Erro ao reabrir conversa:", error);
                  toast.error("Erro ao reabrir conversa");
                }
              }}
            >
              Reabrir Conversa
            </Button>
          </div>
        ) : (
          <>
            {/* Internal note toggle and Quick Replies */}
            <div className="flex items-center gap-2">
              <Button
                variant={isInternal ? "default" : "outline"}
                size="sm"
                onClick={() => setIsInternal(!isInternal)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Nota Interna
              </Button>
              <QuickRepliesSelector
                onSelect={handleQuickReplySelect}
                userId={conversation?.user_id}
              />
            </div>

            {/* Attachment Upload */}
            <AttachmentUpload
              compact
              onFilesSelected={handleFilesSelected}
              onRemoveFile={handleRemoveFile}
              selectedFiles={selectedFiles}
              disabled={isSending}
            />

            {/* Text input */}
            <div className="flex gap-2">
              <Textarea
                placeholder={
                  isInternal
                    ? "Escreva uma nota interna (visível apenas para admins)..."
                    : "Digite sua mensagem..."
                }
                value={newMessageRaw}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewMessageRaw(value);

                  // Start typing indicator if text is not empty and not internal note
                  if (value.trim() && !isInternal) {
                    startTyping();
                  } else {
                    stopTyping();
                  }
                }}
                onKeyDown={handleKeyDown}
                onBlur={stopTyping}
                rows={3}
                className={isInternal ? "bg-yellow-50 dark:bg-yellow-950" : ""}
                disabled={isSending}
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSend}
                  disabled={isSending || (!newMessageSanitized.trim() && !selectedFiles.length)}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Character count and status */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {newMessageRaw.length}/2000 caracteres
                {isInternal && " • Nota interna"}
                {selectedFiles.length > 0 && ` • ${selectedFiles.length} arquivo(s)`}
              </span>
              <span>
                {isUploading
                  ? "Enviando arquivos..."
                  : "Enter para enviar, Shift+Enter para quebra de linha"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  formatTimestamp: (timestamp: string) => string;
  onDelete: (messageId: string) => void;
  onEdit: (messageId: string, currentText: string) => void;
  isEditing: boolean;
  editingText: string;
  onEditTextChange: (text: string) => void;
  onSaveEdit: (messageId: string) => void;
  onCancelEdit: () => void;
}

function MessageBubble({
  message,
  formatTimestamp,
  onDelete,
  onEdit,
  isEditing,
  editingText,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
}: MessageBubbleProps) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const isAdmin = message.sender_type === "admin";
  const isSystem = message.sender_type === "system";
  const isInternal = message.is_internal;
  const isDeleted = !!message.deleted_at;
  const hasAttachments = message.attachments && message.attachments.length > 0;

  // Verificar se pode editar (dentro de 15 minutos)
  const canEdit = () => {
    if (!currentUser || message.sender_id !== currentUser || isDeleted) return false;
    const messageTime = new Date(message.created_at).getTime();
    const now = new Date().getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    return now - messageTime <= fifteenMinutes;
  };

  // Obter usuário atual
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user?.id || null);
    });
  }, []);

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from("support-attachments").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const isImage = (fileType: string) => {
    return fileType.startsWith("image/");
  };

  // Mensagem deletada
  if (isDeleted) {
    return (
      <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[70%] rounded-lg p-3 bg-muted/50 border border-dashed">
          <p className="text-sm text-muted-foreground italic">Mensagem deletada</p>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(message.created_at)}
          </span>
        </div>
      </div>
    );
  }

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-muted px-4 py-2 rounded-lg max-w-md text-center">
          <p className="text-sm text-muted-foreground italic">{message.message}</p>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(message.created_at)}
          </span>
        </div>
      </div>
    );
  }

  if (isInternal) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-950 border-l-4 border-yellow-500 p-4 rounded group relative">
        <div className="flex items-start gap-2 mb-2">
          <Lock className="h-4 w-4 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{message.sender_name}</span>
              <Badge variant="secondary" className="text-xs">
                Nota Interna
              </Badge>
            </div>

            {/* Modo de edição */}
            {isEditing ? (
              <div className="space-y-2 p-2 bg-white rounded">
                <textarea
                  value={editingText}
                  onChange={(e) => onEditTextChange(e.target.value)}
                  className="w-full min-h-[60px] text-sm p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#000000",
                    fontFamily: "inherit",
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onSaveEdit(message.id)}>
                    <Check className="h-3 w-3 mr-1" />
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                    <X className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm whitespace-pre-wrap">{message.message}</p>

                {/* Attachments */}
                {hasAttachments && (
                  <div className="mt-3 space-y-2">
                    {message.attachments!.map((attachment, idx) => (
                      <AttachmentDisplay
                        key={idx}
                        attachment={attachment}
                        getPublicUrl={getPublicUrl}
                        isImage={isImage}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(message.created_at)}
            {message.edited_at && " (editada)"}
          </span>
          {!isEditing && currentUser === message.sender_id && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {canEdit() && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onEdit(message.id, message.message)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onDelete(message.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-lg p-3 group relative ${
          isAdmin ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{message.sender_name}</span>
          <span className="text-xs opacity-70">
            {formatTimestamp(message.created_at)}
            {message.edited_at && " (editada)"}
          </span>
        </div>

        {/* Modo de edição */}
        {isEditing ? (
          <div className="space-y-2 p-2 bg-white rounded">
            <textarea
              value={editingText}
              onChange={(e) => onEditTextChange(e.target.value)}
              className="w-full min-h-[60px] text-sm p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: "#ffffff",
                color: "#000000",
                fontFamily: "inherit",
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => onSaveEdit(message.id)}>
                <Check className="h-3 w-3 mr-1" />
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                <X className="h-3 w-3 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{message.message}</p>

            {/* Attachments */}
            {hasAttachments && (
              <div className="mt-3 space-y-2">
                {message.attachments!.map((attachment, idx) => (
                  <AttachmentDisplay
                    key={idx}
                    attachment={attachment}
                    getPublicUrl={getPublicUrl}
                    isImage={isImage}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Botões de ação - apenas para o autor */}
        {!isEditing && currentUser === message.sender_id && (
          <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canEdit() && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                onClick={() => onEdit(message.id, message.message)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onDelete(message.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface AttachmentDisplayProps {
  attachment: any;
  getPublicUrl: (filePath: string) => string;
  isImage: (fileType: string) => boolean;
  isAdmin?: boolean;
}

function AttachmentDisplay({ attachment, getPublicUrl, isImage, isAdmin }: AttachmentDisplayProps) {
  const [imageError, setImageError] = useState(false);
  const publicUrl = getPublicUrl(attachment.file_path);
  const thumbnailUrl = attachment.thumbnail_path ? getPublicUrl(attachment.thumbnail_path) : null;
  const fileIsImage = isImage(attachment.file_type);

  const handleDownload = () => {
    window.open(publicUrl, "_blank");
  };

  if (fileIsImage) {
    // Se houve erro ao carregar a imagem, mostrar como arquivo
    if (imageError) {
      return (
        <div
          className={`flex items-center gap-2 p-2 rounded border ${
            isAdmin
              ? "border-primary-foreground/20 bg-primary-foreground/10"
              : "border-border bg-background"
          }`}
        >
          <FileText className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{attachment.file_name}</p>
            <p className="text-xs opacity-70">Imagem não disponível</p>
          </div>
          <Button size="sm" variant="ghost" onClick={handleDownload} className="flex-shrink-0">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <div className="relative group">
        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={thumbnailUrl || publicUrl}
            alt={attachment.file_name}
            className="max-w-[200px] max-h-[200px] rounded border-2 border-border hover:border-primary transition-colors cursor-pointer"
            onError={(e) => {
              // Tentar carregar a imagem original se o thumbnail falhar
              if (thumbnailUrl && e.currentTarget.src === thumbnailUrl) {
                e.currentTarget.src = publicUrl;
              } else {
                // Se a imagem original também falhar, marcar como erro
                setImageError(true);
              }
            }}
          />
        </a>
        <Button
          size="sm"
          variant="secondary"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleDownload}
        >
          <Download className="h-3 w-3 mr-1" />
          Baixar
        </Button>
      </div>
    );
  }

  // PDF ou outro arquivo
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded border ${
        isAdmin
          ? "border-primary-foreground/20 bg-primary-foreground/10"
          : "border-border bg-background"
      }`}
    >
      <FileText className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{attachment.file_name}</p>
        <p className="text-xs opacity-70">{(attachment.file_size / 1024).toFixed(1)} KB</p>
      </div>
      <Button size="sm" variant="ghost" onClick={handleDownload} className="flex-shrink-0">
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}
