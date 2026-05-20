import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMessages } from "@/hooks/useMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Attachment, Message } from "@/types/support";
import { supabase } from "@/integrations/supabase/client";
import { conversationService } from "@/lib/services/conversationService";
import { toast } from "sonner";

/**
 * Converte file_path para URL pública do Supabase Storage
 */
function getAttachmentUrl(filePath: string): string {
  const BUCKET_NAME = "support-attachments";
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * CustomerMessageList Component
 *
 * Displays messages in a conversation for customers.
 * Features:
 * - Renders messages (excludes internal notes)
 * - Shows order status updates (system messages)
 * - Auto-scrolls to latest message
 * - Infinite scroll for older messages
 * - Typing indicator
 *
 * Requirements: 14.2, 14.8, 3.2, 3.6
 */
interface CustomerMessageListProps {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
  isClosed?: boolean; // Indica se a conversa está encerrada
}

export function CustomerMessageList({
  conversationId,
  currentUserId,
  currentUserName,
  isClosed = false,
}: CustomerMessageListProps) {
  const {
    messages,
    loading,
    hasMore,
    loadMore,
    messagesEndRef,
    optimisticAttachments,
  } = useMessages({ conversationId, autoScroll: true });

  // Typing indicator
  const { typingText } = useTypingIndicator({
    conversationId,
    currentUserId,
    currentUserName,
  });

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

  // Filter out internal notes (customers should never see them)
  const visibleMessages = messages.filter((msg) => !msg.is_internal);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Closed Conversation Banner */}
      {isClosed && (
        <div className="bg-muted border border-border rounded-lg p-4 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            ⚠️ Este atendimento foi encerrado
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Precisa de ajuda? Inicie uma nova solicitação
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) {
                  toast.error("Você precisa estar autenticado");
                  return;
                }

                // Criar nova conversa
                const newConversation = await conversationService.createConversation({
                  user_id: user.id,
                  subject: "Nova Solicitação",
                  status: "new",
                });

                toast.success("Nova conversa iniciada!");

                // Disparar evento customizado para o CustomerChat atualizar
                window.dispatchEvent(
                  new CustomEvent("newConversationCreated", {
                    detail: { conversation: newConversation },
                  })
                );
              } catch (error) {
                console.error("Erro ao criar nova conversa:", error);
                toast.error("Erro ao criar nova solicitação");
              }
            }}
          >
            Nova Solicitação
          </Button>
        </div>
      )}

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
            {loading ? "Carregando..." : "Carregar mensagens antigas"}
          </Button>
        </div>
      )}

      {/* Messages */}
      {visibleMessages.map((message) => (
        <CustomerMessageBubble
          key={message.id}
          message={message}
          formatTimestamp={formatTimestamp}
          optimisticAttachments={optimisticAttachments?.get(message.id) || []}
        />
      ))}

      {/* Empty state */}
      {!loading && visibleMessages.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma mensagem ainda. Envie a primeira mensagem!
        </div>
      )}

      {/* Typing indicator */}
      <TypingIndicator typingText={typingText} />

      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}

interface CustomerMessageBubbleProps {
  message: Message;
  formatTimestamp: (timestamp: string) => string;
  optimisticAttachments?: Array<{
    id: string;
    file: File;
    status: "uploading" | "uploaded" | "error";
    progress: number;
    url?: string;
    error?: string;
  }>;
}

function CustomerMessageBubble({
  message,
  formatTimestamp,
  optimisticAttachments = [],
}: CustomerMessageBubbleProps) {
  const isCustomer = message.sender_type === "customer";
  const isSystem = message.sender_type === "system";

  // Debug: log attachments
  if (message.attachments && message.attachments.length > 0) {
    console.log(
      `[CustomerMessageBubble] Mensagem ${message.id} tem ${message.attachments.length} anexos:`,
      message.attachments
    );
  }

  // System messages (order status updates, etc.)
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-4 py-3 rounded-lg max-w-md">
          <div className="flex items-start gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">
              Atualização Automática
            </Badge>
          </div>
          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
          <span className="text-xs text-muted-foreground mt-2 block">
            {formatTimestamp(message.created_at)}
          </span>
        </div>
      </div>
    );
  }

  // Regular messages
  return (
    <div className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          isCustomer ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {isCustomer ? "Você" : message.sender_name || "Suporte"}
          </span>
          <span className="text-xs opacity-70">{formatTimestamp(message.created_at)}</span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{message.message}</p>

        {/* Optimistic Attachments (uploading) */}
        {optimisticAttachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {optimisticAttachments.map((attachment) => {
              const isImage = attachment.file.type.startsWith("image/");
              const previewUrl = isImage ? URL.createObjectURL(attachment.file) : null;

              if (attachment.status === "error") {
                return (
                  <div
                    key={attachment.id}
                    className={`text-xs p-2 rounded border border-destructive ${
                      isCustomer ? "bg-destructive/10" : "bg-destructive/10"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>❌ {attachment.file.name}</span>
                      <span className="text-destructive">
                        {attachment.error || "Erro ao enviar"}
                      </span>
                    </div>
                  </div>
                );
              }

              if (isImage && previewUrl) {
                return (
                  <div key={attachment.id} className="relative">
                    <img
                      src={previewUrl}
                      alt={attachment.file.name}
                      className="max-w-full max-h-64 rounded border opacity-70"
                      loading="lazy"
                    />
                    {attachment.status === "uploading" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                        <div className="text-white text-sm">Enviando... {attachment.progress}%</div>
                      </div>
                    )}
                    <span className="text-xs opacity-70 mt-1 block">📎 {attachment.file.name}</span>
                  </div>
                );
              }

              return (
                <div
                  key={attachment.id}
                  className={`text-xs p-2 rounded border ${
                    isCustomer ? "border-primary-foreground/20" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>📎 {attachment.file.name}</span>
                    {attachment.status === "uploading" && (
                      <span className="opacity-70">Enviando... {attachment.progress}%</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Attachments (confirmed) */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment: Attachment) => {
              const isImage = attachment.file_type?.startsWith("image/");
              const publicUrl = getAttachmentUrl(attachment.file_path);

              if (isImage) {
                return (
                  <a
                    key={attachment.id}
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={publicUrl}
                      alt={attachment.file_name}
                      className="max-w-full max-h-64 rounded border"
                      loading="lazy"
                    />
                    <span className="text-xs opacity-70 mt-1 block">📎 {attachment.file_name}</span>
                  </a>
                );
              }

              return (
                <a
                  key={attachment.id}
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs underline block p-2 rounded border ${
                    isCustomer
                      ? "border-primary-foreground/20 hover:bg-primary-foreground/10"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  📎 {attachment.file_name}
                  {attachment.file_size && (
                    <span className="ml-2 opacity-70">
                      ({(attachment.file_size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
