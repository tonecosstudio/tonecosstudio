import { useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { fileUploadService } from "@/services/support/file-upload-service";
import { messageService } from "@/services/support/message-service";
import { log } from "@/lib/logger";
import { validateMessage } from "@/lib/validations/support";

type OptimisticAttachmentStatus = "uploading" | "uploaded" | "error";

interface OptimisticAttachmentUpdate {
  status?: OptimisticAttachmentStatus;
  progress?: number;
  url?: string;
  error?: string;
}

interface CustomerMessageInputProps {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
  isClosed?: boolean;
  onMessageSent?: () => void;
  addOptimisticAttachment?: (messageId: string, file: File) => string;
  updateOptimisticAttachment?: (
    messageId: string,
    tempId: string,
    updates: OptimisticAttachmentUpdate
  ) => void;
  onCreateConversation?: () => void | Promise<void>;
  isCreatingConversation?: boolean;
}

export function CustomerMessageInput({
  conversationId,
  currentUserId,
  currentUserName,
  isClosed = false,
  onMessageSent,
  addOptimisticAttachment,
  updateOptimisticAttachment,
  onCreateConversation,
  isCreatingConversation = false,
}: CustomerMessageInputProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { startTyping, stopTyping } = useTypingIndicator({
    conversationId,
    currentUserId,
    currentUserName,
  });

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles: File[] = [];

    for (const file of files) {
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];

      if (!validTypes.includes(file.type)) {
        toast.error(`Arquivo ${file.name} nao e suportado. Use JPEG, PNG ou PDF.`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Arquivo ${file.name} e muito grande. Maximo 5 MB.`);
        continue;
      }

      validFiles.push(file);
    }

    setSelectedFiles((current) => [...current, ...validFiles]);
    event.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSend = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) {
      toast.error("Digite uma mensagem ou anexe um arquivo.");
      return;
    }

    if (newMessage.trim()) {
      const validation = validateMessage(newMessage);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
    }

    if (!currentUserId) {
      toast.error("Voce precisa estar autenticado.");
      return;
    }

    try {
      setIsSending(true);
      setIsUploading(selectedFiles.length > 0);
      stopTyping();

      const messageText = newMessage.trim() || (selectedFiles.length > 0 ? "(anexo)" : "");
      const messageData = await messageService.sendMessage({
        conversation_id: conversationId,
        sender_id: currentUserId,
        sender_type: "customer",
        message: messageText,
        is_internal: false,
      });

      setNewMessage("");
      const filesToUpload = [...selectedFiles];
      setSelectedFiles([]);

      if (filesToUpload.length > 0 && addOptimisticAttachment && updateOptimisticAttachment) {
        log.debug("Sending customer attachments with optimistic updates", {
          conversationId,
          count: filesToUpload.length,
        });

        for (const file of filesToUpload) {
          const tempId = addOptimisticAttachment(messageData.id, file);

          try {
            const uploadResult = await fileUploadService.uploadFile(
              file,
              conversationId,
              messageData.id,
              currentUserId
            );

            updateOptimisticAttachment(messageData.id, tempId, {
              status: "uploaded",
              progress: 100,
              url: uploadResult.public_url,
            });
          } catch (error) {
            log.error("Erro ao fazer upload de anexo customer", {
              error,
              conversationId,
              messageId: messageData.id,
              fileName: file.name,
            });

            updateOptimisticAttachment(messageData.id, tempId, {
              status: "error",
              error: error instanceof Error ? error.message : "Erro desconhecido",
            });

            toast.error(`Erro ao enviar ${file.name}`);
          }
        }
      } else if (filesToUpload.length > 0) {
        log.debug("Sending customer attachments in compatibility mode", {
          conversationId,
          count: filesToUpload.length,
        });

        for (const file of filesToUpload) {
          try {
            await fileUploadService.uploadFile(file, conversationId, messageData.id, currentUserId);
          } catch (error) {
            log.error("Erro ao fazer upload de anexo customer", {
              error,
              conversationId,
              messageId: messageData.id,
              fileName: file.name,
            });
            toast.error(`Erro ao enviar ${file.name}`);
          }
        }
      }

      toast.success("Mensagem enviada.");

      if (onMessageSent) {
        log.warn("CustomerMessageInput onMessageSent callback is deprecated");
        onMessageSent();
      }
    } catch (error) {
      log.error("Erro ao enviar mensagem customer", { error, conversationId, currentUserId });
      toast.error("Erro ao enviar mensagem.");
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  if (isClosed) {
    return (
      <div className="border-t border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] p-6 text-center">
        <div className="mb-4 text-zinc-400">
          <p className="mb-1 font-medium">Atendimento encerrado</p>
          <p className="text-sm">Esta conversa foi encerrada. Se precisar, abra uma nova.</p>
        </div>
        <Button
          variant="default"
          onClick={() => void onCreateConversation?.()}
          disabled={!onCreateConversation || isCreatingConversation}
        >
          {isCreatingConversation ? "Criando..." : "Nova solicitacao"}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-[hsl(0,0%,5%)]">
      {selectedFiles.length > 0 && (
        <div className="border-b border-[hsl(0,0%,12%)] bg-white/[0.02] px-4 pb-2 pt-3">
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => {
              const isImage = file.type.startsWith("image/");
              const previewUrl = isImage ? URL.createObjectURL(file) : null;

              return (
                <div key={`${file.name}-${index}`} className="relative inline-block">
                  {isImage && previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt={file.name}
                        className="h-20 w-20 rounded-lg border-2 border-[hsl(0,0%,16%)] bg-[hsl(0,0%,8%)] object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 truncate rounded-b-lg bg-black/50 px-1 py-0.5 text-xs text-white">
                        {file.name}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border-2 border-[hsl(0,0%,16%)] bg-[hsl(0,0%,8%)] px-3 py-2 pr-8 text-zinc-100">
                      <span className="max-w-[120px] truncate text-sm">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="mb-2 flex gap-2">
          <textarea
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(event) => {
              const value = event.target.value;
              setNewMessage(value);

              if (value.trim()) {
                startTyping();
              } else {
                stopTyping();
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={stopTyping}
            rows={3}
            disabled={isSending}
            className="flex-1 resize-none rounded-md border border-[hsl(0,0%,16%)] bg-[hsl(0,0%,8%)] px-3 py-2 text-sm text-white ring-offset-black placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(42,100%,55%)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={isSending}
              onClick={() => document.getElementById("file-input-customer")?.click()}
              title="Anexar arquivo (JPEG, PNG ou PDF ate 5 MB)"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-[hsl(0,0%,16%)] bg-[hsl(0,0%,8%)] text-zinc-100 hover:bg-[hsl(0,0%,10%)] disabled:pointer-events-none disabled:opacity-50"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              id="file-input-customer"
              type="file"
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isSending || (!newMessage.trim() && selectedFiles.length === 0)}
              className="flex h-10 w-10 items-center justify-center rounded-md bg-[hsl(42,100%,50%)] text-black hover:bg-[hsl(42,100%,58%)] disabled:pointer-events-none disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex justify-between text-xs text-zinc-500">
          <span>
            {newMessage.length}/2000 caracteres
            {selectedFiles.length > 0 && ` | ${selectedFiles.length} arquivo(s)`}
          </span>
          <span>
            {isUploading
              ? "Enviando arquivos..."
              : "Enter para enviar. Shift+Enter para quebra de linha."}
          </span>
        </div>
      </div>
    </div>
  );
}
