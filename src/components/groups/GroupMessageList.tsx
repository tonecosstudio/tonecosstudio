import { useQuery } from '@tanstack/react-query';
import { messageService } from '@/lib/services/messageService';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare } from 'lucide-react';
import type { GroupMessage, GroupAttachment } from '@/types/groups';

interface GroupMessageListProps {
  groupId: string;
}

/**
 * Converte file_path para URL pública do Supabase Storage
 */
function getAttachmentUrl(filePath: string): string {
  const BUCKET_NAME = "group-attachments";
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Detecta URLs no texto e as torna clicáveis
 */
function linkifyText(text: string, isCurrentUser: boolean): React.ReactNode {
  // Regex para detectar URLs (http, https, www)
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,})/g;
  
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (!part) return null;
    
    // Verifica se é uma URL
    if (part.match(urlRegex)) {
      let url = part;
      
      // Adiciona https:// se não tiver protocolo
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium hover:opacity-80 text-blue-600"
        >
          {part}
        </a>
      );
    }
    
    return <span key={index}>{part}</span>;
  });
}

export function GroupMessageList({ groupId }: GroupMessageListProps) {
  const { user } = useAuth();
  
  const { data, isLoading } = useQuery({
    queryKey: ['group-messages', groupId],
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      return messageService.listGroupMessages(groupId, user.id);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    // Removido refetchInterval - Realtime cuida das atualizações
  });

  const messages = data?.messages || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
          >
            <div className="max-w-[70%] rounded-lg p-4 bg-white border border-gray-200 animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
                <div className="h-3 w-16 bg-gray-100 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhuma mensagem enviada ainda</p>
          <p className="text-sm text-muted-foreground mt-1">
            Envie a primeira mensagem para este grupo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isCurrentUser = message.sender_id === user?.id;
        const msg = message as GroupMessage & { 
          sender_name: string; 
          sender_avatar: string; 
          attachments: GroupAttachment[];
          link_text?: string | null;
          link_url?: string | null;
          action_button_text?: string | null;
          action_button_url?: string | null;
        };
        
        return (
          <div
            key={msg.id}
            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[70%] rounded-lg p-4 shadow-sm bg-white border border-gray-200"
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-sm text-gray-700">
                  {isCurrentUser ? 'Você' : msg.sender_name || 'Admin'}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(msg.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>

              {/* Message Text */}
              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-800">
                {linkifyText(msg.message, isCurrentUser)}
              </div>

              {/* Highlighted Link */}
              {msg.link_text && msg.link_url && (
                <a
                  href={msg.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-sm font-medium underline text-blue-600 hover:text-blue-700"
                >
                  🔗 {msg.link_text}
                </a>
              )}

              {/* Action Button */}
              {msg.action_button_text && msg.action_button_url && (
                <a
                  href={msg.action_button_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 mt-3 px-4 py-2 rounded-lg font-medium text-sm transition-colors bg-blue-600 text-white hover:bg-blue-700"
                >
                  {msg.action_button_text} →
                </a>
              )}

              {/* Attachments */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.attachments.map((attachment: any) => {
                    const isImage = attachment.file_type?.startsWith('image/');
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
                            className="max-w-full max-h-64 rounded-lg border-2 border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                            loading="lazy"
                          />
                          <span className="text-xs mt-1 block text-gray-600">
                            📎 {attachment.file_name}
                          </span>
                        </a>
                      );
                    }
                    
                    return (
                      <a
                        key={attachment.id}
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium underline block p-2 rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
                      >
                        📎 {attachment.file_name}
                        {attachment.file_size && (
                          <span className="ml-2 text-gray-500">
                            ({(attachment.file_size / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Edited indicator */}
              {msg.updated_at !== msg.created_at && (
                <p className="text-xs mt-2 italic text-gray-500">
                  (editada)
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
