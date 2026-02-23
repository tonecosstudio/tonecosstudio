/**
 * CustomerMessageInput - Input de mensagens para clientes
 * RECRIADO DO ZERO - Versão simplificada e funcional
 * ATUALIZADO: Optimistic updates para anexos + Typing indicator
 */

import { useState } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { messageService } from "@/lib/services/messageService";
import { conversationService } from "@/lib/services/conversationService";
import { fileUploadService } from "@/lib/services/fileUploadService";
import { validateMessage } from "@/lib/validations/support";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { toast } from "sonner";

interface CustomerMessageInputProps {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
  isClosed?: boolean; // Indica se a conversa está encerrada
  onMessageSent?: () => void; // Callback após enviar mensagem (DEPRECATED - será removido)
  addOptimisticAttachment?: (messageId: string, file: File) => string;
  updateOptimisticAttachment?: (messageId: string, tempId: string, updates: any) => void;
}

export function CustomerMessageInput({ 
  conversationId, 
  currentUserId,
  currentUserName,
  isClosed = false,
  onMessageSent,
  addOptimisticAttachment,
  updateOptimisticAttachment,
}: CustomerMessageInputProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Typing indicator
  const { startTyping, stopTyping } = useTypingIndicator({
    conversationId,
    currentUserId,
    currentUserName,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    
    for (const file of files) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error(`Arquivo ${file.name} não é suportado. Use JPEG, PNG ou PDF.`);
        continue;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Arquivo ${file.name} é muito grande. Máximo 5MB.`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) {
      toast.error("Digite uma mensagem ou anexe um arquivo");
      return;
    }

    if (newMessage.trim()) {
      const validation = validateMessage(newMessage);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
    }

    try {
      setIsSending(true);
      setIsUploading(selectedFiles.length > 0);
      
      // Stop typing indicator immediately when sending
      stopTyping();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar autenticado");
        return;
      }

      const messageText = newMessage.trim() || (selectedFiles.length > 0 ? "(anexo)" : "");

      // Enviar mensagem primeiro
      const messageData = await messageService.sendMessage({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_type: "customer",
        message: messageText,
        is_internal: false,
      });

      // Limpar input imediatamente para melhor UX
      setNewMessage("");
      const filesToUpload = [...selectedFiles];
      setSelectedFiles([]);

      // Upload de anexos com optimistic updates
      if (filesToUpload.length > 0 && addOptimisticAttachment && updateOptimisticAttachment) {
        console.log(`[CustomerMessageInput] Enviando ${filesToUpload.length} anexos com optimistic updates`);
        
        for (const file of filesToUpload) {
          // Criar optimistic attachment
          const tempId = addOptimisticAttachment(messageData.id, file);
          
          try {
            // Upload com progress tracking
            const uploadResult = await fileUploadService.uploadFile(
              file,
              conversationId,
              messageData.id,
              user.id,
              (progress) => {
                updateOptimisticAttachment(messageData.id, tempId, { progress });
              }
            );
            
            console.log(`[CustomerMessageInput] Anexo enviado com sucesso:`, uploadResult);
            
            // Marcar como uploaded (será substituído pelo real via Realtime)
            updateOptimisticAttachment(messageData.id, tempId, {
              status: 'uploaded',
              url: uploadResult.url,
            });
          } catch (error) {
            console.error("Erro ao fazer upload:", error);
            
            // Marcar como erro
            updateOptimisticAttachment(messageData.id, tempId, {
              status: 'error',
              error: error instanceof Error ? error.message : 'Erro desconhecido',
            });
            
            toast.error(`Erro ao enviar ${file.name}`);
          }
        }
      } else if (filesToUpload.length > 0) {
        // Fallback: upload sem optimistic updates (compatibilidade)
        console.log(`[CustomerMessageInput] Enviando ${filesToUpload.length} anexos (modo compatibilidade)`);
        for (const file of filesToUpload) {
          try {
            await fileUploadService.uploadFile(
              file,
              conversationId,
              messageData.id,
              user.id
            );
          } catch (error) {
            console.error("Erro ao fazer upload:", error);
            toast.error(`Erro ao enviar ${file.name}`);
          }
        }
      }

      toast.success("Mensagem enviada");
      
      // DEPRECATED: Callback será removido em versão futura
      if (onMessageSent) {
        console.warn("[CustomerMessageInput] onMessageSent callback is deprecated and will be removed");
        onMessageSent();
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Se a conversa está encerrada, mostrar mensagem com opção de nova solicitação
  if (isClosed) {
    return (
      <div className="bg-muted border-t p-6 text-center">
        <div className="text-muted-foreground mb-4">
          <p className="font-medium mb-1">Atendimento Encerrado</p>
          <p className="text-sm">
            Esta conversa foi encerrada. Precisa de ajuda?
          </p>
        </div>
        <Button
          variant="default"
          onClick={async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
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
              window.dispatchEvent(new CustomEvent('newConversationCreated', { 
                detail: { conversation: newConversation } 
              }));
            } catch (error) {
              console.error("Erro ao criar nova conversa:", error);
              toast.error("Erro ao criar nova solicitação");
            }
          }}
        >
          Nova Solicitação
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background">
      {/* Preview de arquivos */}
      {selectedFiles.length > 0 && (
        <div className="px-4 pt-3 pb-2 border-b bg-muted/20">
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => {
              const isImage = file.type.startsWith('image/');
              const previewUrl = isImage ? URL.createObjectURL(file) : null;
              
              return (
                <div key={index} className="relative inline-block">
                  {isImage && previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt={file.name}
                        className="w-20 h-20 object-cover rounded-lg border-2 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:bg-destructive/90"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 truncate rounded-b-lg">
                        {file.name}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border-2 pr-8">
                      <span className="text-sm truncate max-w-[120px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4">
        <div className="flex gap-2 mb-2">
          <textarea
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => {
              const value = e.target.value;
              setNewMessage(value);
              
              // Start typing indicator if text is not empty
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
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={isSending}
              onClick={() => document.getElementById('file-input-customer')?.click()}
              title="Anexar arquivo (JPEG, PNG, PDF até 5MB)"
              className="w-10 h-10 flex items-center justify-center border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md disabled:opacity-50 disabled:pointer-events-none"
            >
              <Paperclip className="w-4 h-4" />
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
              onClick={handleSend}
              disabled={isSending || (!newMessage.trim() && selectedFiles.length === 0)}
              className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 rounded-md disabled:opacity-50 disabled:pointer-events-none"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {newMessage.length}/2000 caracteres
            {selectedFiles.length > 0 && ` • ${selectedFiles.length} arquivo(s)`}
          </span>
          <span>
            {isUploading ? "Enviando arquivos..." : "Enter para enviar, Shift+Enter para quebra de linha"}
          </span>
        </div>
      </div>
    </div>
  );
}
