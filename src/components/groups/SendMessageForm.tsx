import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '@/lib/services/messageService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send, Paperclip, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SendMessageFormProps {
  groupId: string;
}

export function SendMessageForm({ groupId }: SendMessageFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [actionButtonText, setActionButtonText] = useState('');
  const [actionButtonUrl, setActionButtonUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      
      const richFields = {
        action_button_text: actionButtonText || undefined,
        action_button_url: actionButtonUrl || undefined,
        link_text: linkText || undefined,
        link_url: linkUrl || undefined,
      };
      
      return messageService.sendBroadcastMessage(groupId, user.id, message, richFields, attachments);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      toast({
        title: 'Mensagem enviada',
        description: 'A mensagem foi enviada para todos os membros do grupo.',
      });
      setMessage('');
      setAttachments([]);
      setActionButtonText('');
      setActionButtonUrl('');
      setLinkText('');
      setLinkUrl('');
      setShowAdvanced(false);
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
    
    if (!message.trim() && attachments.length === 0) {
      toast({
        title: 'Mensagem vazia',
        description: 'Por favor, digite uma mensagem ou anexe um arquivo.',
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + attachments.length > 5) {
      toast({
        title: 'Limite de anexos',
        description: 'Você pode anexar no máximo 5 arquivos por mensagem.',
        variant: 'destructive',
      });
      return;
    }
    
    setAttachments([...attachments, ...files]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-muted px-3 py-2 rounded-md text-sm"
              >
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <Textarea
            placeholder="Digite sua mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sendMutation.isPending}
            rows={4}
            className="resize-none"
          />
          <div className="text-xs text-muted-foreground mt-1">
            {message.length}/5000 caracteres
            {attachments.length > 0 && (
              <span className="ml-4">{attachments.length}/5 anexos</span>
            )}
          </div>
        </div>

        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs"
          >
            {showAdvanced ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            Opções Avançadas
          </Button>

          {showAdvanced && (
            <div className="mt-3 space-y-3 p-3 border rounded-md bg-muted/50">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="actionButtonText" className="text-xs">Texto do Botão</Label>
                  <Input
                    id="actionButtonText"
                    placeholder="Ex: Ver mais"
                    value={actionButtonText}
                    onChange={(e) => setActionButtonText(e.target.value)}
                    disabled={sendMutation.isPending}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="actionButtonUrl" className="text-xs">URL do Botão</Label>
                  <Input
                    id="actionButtonUrl"
                    placeholder="https://..."
                    value={actionButtonUrl}
                    onChange={(e) => setActionButtonUrl(e.target.value)}
                    disabled={sendMutation.isPending}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="linkText" className="text-xs">Texto do Link</Label>
                  <Input
                    id="linkText"
                    placeholder="Ex: Saiba mais"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    disabled={sendMutation.isPending}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="linkUrl" className="text-xs">URL do Link</Label>
                  <Input
                    id="linkUrl"
                    placeholder="https://..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    disabled={sendMutation.isPending}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
            disabled={sendMutation.isPending || attachments.length >= 5}
          />
          
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={sendMutation.isPending || attachments.length >= 5}
          >
            <Paperclip className="w-4 h-4 mr-2" />
            Anexar
          </Button>

          <Button
            type="submit"
            disabled={sendMutation.isPending || (!message.trim() && attachments.length === 0)}
            className="flex-1"
          >
            <Send className="w-4 h-4 mr-2" />
            {sendMutation.isPending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
