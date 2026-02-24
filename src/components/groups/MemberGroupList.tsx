import { useQuery } from '@tanstack/react-query';
import { groupService } from '@/lib/services/groupService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { GroupErrorBoundary } from './GroupErrorBoundary';

function MemberGroupListContent() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: groups = [], isLoading, error } = useQuery({
    queryKey: ['member-groups', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      return groupService.getMemberGroups(user.id);
    },
    enabled: !!user,
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center border-destructive">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-destructive" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar grupos</h3>
        <p className="text-muted-foreground mb-4">
          {error instanceof Error ? error.message : 'Erro desconhecido'}
        </p>
      </Card>
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
          role="button"
          tabIndex={0}
          aria-label={`Abrir grupo ${group.name}${group.unread_count > 0 ? `, ${group.unread_count} mensagens não lidas` : ''}`}
          className="p-4 hover:bg-accent/50 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          onClick={() => navigate(`/grupos/${group.id}`)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(`/grupos/${group.id}`);
            }
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{group.name}</h3>
                {group.unread_count > 0 && (
                  <Badge variant="destructive" className="rounded-full" aria-label={`${group.unread_count} não lidas`}>
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

// Wrapper com Error Boundary
export function MemberGroupList() {
  return (
    <GroupErrorBoundary>
      <MemberGroupListContent />
    </GroupErrorBoundary>
  );
}
