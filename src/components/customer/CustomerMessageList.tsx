import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { useSupportAttachmentPublicUrl } from "@/hooks/customer/useCustomerSupportConversationActions";
import { useMessages } from "@/hooks/useMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { log } from "@/lib/logger";
import { sanitizeURL } from "@/lib/security/input-sanitizer";
import type { Attachment, Message } from "@/types/support";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CustomerMessageListProps {
  conversationId: string;
  currentUserId?: string;
  currentUserName?: string;
  isClosed?: boolean;
  onCreateConversation?: () => void | Promise<void>;
  isCreatingConversation?: boolean;
}

function getSafeAttachmentUrl(url: string): string | null {
  try {
    return sanitizeURL(url, ["http", "https"]);
  } catch {
    return null;
  }
}

export function CustomerMessageList({
  conversationId,
  currentUserId = "",
  currentUserName = "Cliente",
  isClosed = false,
  onCreateConversation,
  isCreatingConversation = false,
}: CustomerMessageListProps) {
  const { messages, loading, hasMore, loadMore, messagesEndRef, optimisticAttachments } =
    useMessages({ conversationId, autoScroll: true });

  const { typingText } = useTypingIndicator({
    conversationId,
    currentUserId,
    currentUserName,
  });

  const visibleMessages = messages.filter((message) => !message.is_internal);

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

  return (
    <div className="flex-1 space-y-4 overflow-y-auto bg-[hsl(0,0%,5%)] p-4">
      {isClosed && onCreateConversation && (
        <div className="rounded-lg border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,7%)] p-4 text-center">
          <p className="mb-1 text-sm font-medium text-zinc-300">
            Este atendimento foi encerrado.
          </p>
          <p className="mb-3 text-xs text-zinc-500">
            Se precisar de ajuda novamente, abra uma nova solicitacao.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onCreateConversation()}
            disabled={isCreatingConversation}
            className="border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] text-zinc-100 hover:bg-[hsl(0,0%,10%)]"
          >
            {isCreatingConversation ? "Criando..." : "Nova solicitacao"}
          </Button>
        </div>
      )}

      {hasMore && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
            {loading ? "Carregando..." : "Carregar mensagens antigas"}
          </Button>
        </div>
      )}

      {visibleMessages.map((message) => (
        <CustomerMessageBubble
          key={message.id}
          message={message}
          formatTimestamp={formatTimestamp}
          optimisticAttachments={optimisticAttachments?.get(message.id) || []}
        />
      ))}

      {!loading && visibleMessages.length === 0 && (
        <div className="py-8 text-center text-zinc-500">
          Nenhuma mensagem ainda. Envie a primeira mensagem.
        </div>
      )}

      <TypingIndicator typingText={typingText} />
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
  const getSupportAttachmentPublicUrl = useSupportAttachmentPublicUrl();
  const isCustomer = message.sender_type === "customer";
  const isSystem = message.sender_type === "system";

  if (message.attachments && message.attachments.length > 0) {
    log.debug("Customer message attachments rendered", {
      messageId: message.id,
      attachmentCount: message.attachments.length,
    });
  }

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="max-w-md rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sky-100">
          <div className="mb-1 flex items-start gap-2">
            <Badge className="border-sky-500/30 bg-sky-500/15 text-xs text-sky-100">
              Atualizacao automatica
            </Badge>
          </div>
          <p className="whitespace-pre-wrap text-sm">{message.message}</p>
          <span className="mt-2 block text-xs text-sky-200/80">
            {formatTimestamp(message.created_at)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          isCustomer
            ? "bg-[hsl(42,100%,50%)] text-black"
            : "border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,8%)] text-zinc-100"
        }`}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-medium">
            {isCustomer ? "Voce" : message.sender_name || "Suporte"}
          </span>
          <span className="text-xs opacity-70">{formatTimestamp(message.created_at)}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm">{message.message}</p>

        {optimisticAttachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {optimisticAttachments.map((attachment) => {
              const isImage = attachment.file.type.startsWith("image/");
              const previewUrl = isImage ? URL.createObjectURL(attachment.file) : null;

              if (attachment.status === "error") {
                return (
                  <div
                    key={attachment.id}
                    className="rounded border border-red-500/40 bg-red-500/10 p-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span>Arquivo: {attachment.file.name}</span>
                      <span className="text-red-200">
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
                      className="max-h-64 max-w-full rounded border border-black/20 opacity-70"
                      loading="lazy"
                    />
                    {attachment.status === "uploading" && (
                      <div className="absolute inset-0 flex items-center justify-center rounded bg-black/50">
                        <div className="text-sm text-white">
                          Enviando... {attachment.progress}%
                        </div>
                      </div>
                    )}
                    <span className="mt-1 block text-xs opacity-70">
                      Anexo: {attachment.file.name}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={attachment.id}
                  className={`rounded border p-2 text-xs ${
                    isCustomer ? "border-black/20" : "border-[hsl(0,0%,18%)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>Anexo: {attachment.file.name}</span>
                    {attachment.status === "uploading" && (
                      <span className="opacity-70">Enviando... {attachment.progress}%</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment: Attachment) => {
              const isImage = attachment.file_type?.startsWith("image/");
              const publicUrl = getSupportAttachmentPublicUrl(attachment.file_path);
              const safePublicUrl = getSafeAttachmentUrl(publicUrl);

              if (!safePublicUrl) {
                return null;
              }

              if (isImage) {
                return (
                  <a
                    key={attachment.id}
                    href={safePublicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={safePublicUrl}
                      alt={attachment.file_name}
                      className="max-h-64 max-w-full rounded border border-[hsl(0,0%,18%)]"
                      loading="lazy"
                    />
                    <span className="mt-1 block text-xs opacity-70">
                      Anexo: {attachment.file_name}
                    </span>
                  </a>
                );
              }

              return (
                <a
                  key={attachment.id}
                  href={safePublicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block rounded border p-2 text-xs underline ${
                    isCustomer
                      ? "border-black/20 hover:bg-black/10"
                      : "border-[hsl(0,0%,18%)] hover:bg-white/[0.04]"
                  }`}
                >
                  Anexo: {attachment.file_name}
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
