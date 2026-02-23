// @ts-nocheck
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '@/lib/services/messageService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SendMessageFormProps {
  groupId: string;
}

export function SendMessageForm({ groupId }: SendMessageFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      return messageService.sendBroadcastMessage(groupId, user.id, message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      toast({
        title: 'Mensagem enviada',
        description: 'A mensagem foi enviada para todos os membros do grupo.',
      });
      setMessage('');
    },
    onError: (error) => {
      toast({
        title: 'Erro ao enviar mensagem',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast({
        title: 'Mensagem vazia',
        description: 'Por favor, digite uma mensagem.',
        variant: 'destructive',
      });
      return;
    }
    if (message.length > 5000) {
      toast({
        title: 'Mensagem muito longa',
        description: 'A mensagem não pode ter mais de 5000 caracteres.',
        variant: 'destructive',
      });
      return;
    }
    sendMutation.mutate();
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Textarea
            placeholder="Digite sua mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sendMutation.isPending}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {message.length}/5000 caracteres
          </p>
        </div>

        <Button
          type="submit"
          disabled={sendMutation.isPending || !message.trim()}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          {sendMutation.isPending ? 'Enviando...' : 'Enviar Mensagem'}
        </Button>
      </form>
    </Card>
  );
}
