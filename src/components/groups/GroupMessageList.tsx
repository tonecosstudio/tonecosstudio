// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { messageService } from '@/lib/services/messageService';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface GroupMessageListProps {
  groupId: string;
}

export function GroupMessageList({ groupId }: GroupMessageListProps) {
  const { data: { user } } = supabase.auth.getUser();
  
  const { data, isLoading } = useQuery({
    queryKey: ['group-messages', groupId],
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      return messageService.listGroupMessages(groupId, user.id);
    },
    enabled: !!user,
  });

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
      <h3 className="text-lg font-semibold mb-4">
        Mensagens ({messages.length})
      </h3>

      {messages.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Nenhuma mensagem enviada ainda.
        </p>
      ) : (
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium">{message.sender_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                {message.updated_at !== message.created_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Editada
                  </p>
                )}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {message.attachments.length} anexo(s)
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}
