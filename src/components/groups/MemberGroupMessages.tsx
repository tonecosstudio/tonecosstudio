import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { messageService } from '@/lib/services/messageService';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useGroupMessages } from '@/hooks/useGroupMessages';

interface MemberGroupMessagesProps {
  groupId: string;
}

export function MemberGroupMessages({ groupId }: MemberGroupMessagesProps) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['group-messages', groupId],
    queryFn: async () => {
      if (!userId) throw new Error('Usuário não autenticado');
      return messageService.listGroupMessages(groupId, userId);
    },
    enabled: !!userId,
  });

  // Subscribe to realtime updates
  const { messages: realtimeMessages } = useGroupMessages({ 
    groupId, 
    autoScroll: false 
  });

  // Update last viewed when component mounts or new messages arrive
  useEffect(() => {
    if (userId) {
      messageService.updateLastViewed(groupId, userId).catch(console.error);
    }
  }, [groupId, userId, realtimeMessages]);

  // Invalidate queries when new realtime messages arrive
  useEffect(() => {
    if (realtimeMessages.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
    }
  }, [realtimeMessages, groupId, queryClient]);

  const messages = data?.messages || [];

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">Carregando mensagens...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {messages.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Nenhuma mensagem ainda.
        </p>
      ) : (
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className="flex gap-3 p-4 border rounded-lg bg-card"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={message.sender_avatar || undefined} />
                  <AvatarFallback>
                    {message.sender_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {message.sender_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.message}
                  </p>
                  
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={messageService.getGroupAttachmentUrl(attachment.file_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline block"
                        >
                          📎 {attachment.file_name}
                        </a>
                      ))}
                    </div>
                  )}
                  
                  {message.updated_at !== message.created_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Editada
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}
