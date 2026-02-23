// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { groupService } from '@/lib/services/groupService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function MemberGroupList() {
  const navigate = useNavigate();
  
  const { data: { user } } = supabase.auth.getUser();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['member-groups', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      return groupService.getMemberGroups(user.id);
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        Carregando grupos...
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <Card className="p-8 text-center">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Nenhum grupo ainda</h3>
        <p className="text-muted-foreground">
          Você ainda não faz parte de nenhum grupo de mensagens.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card
          key={group.id}
          className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
          onClick={() => navigate(`/grupos/${group.id}`)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{group.name}</h3>
                {group.unread_count > 0 && (
                  <Badge variant="destructive" className="rounded-full">
                    {group.unread_count}
                  </Badge>
                )}
              </div>
              
              {group.last_message ? (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {group.last_message.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(group.last_message.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma mensagem ainda
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
