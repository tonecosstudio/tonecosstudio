import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipService } from '@/lib/services/membershipService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GroupMember } from '@/types/groups';

interface GroupMembersListProps {
  groupId: string;
  onAddMember?: () => void;
}

export function GroupMembersList({ groupId, onAddMember }: GroupMembersListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => membershipService.listMembers(groupId),
  });

  const members = data?.members || [];

  const removeMutation = useMutation({
    mutationFn: ({ memberId, userId }: { memberId: string; userId: string }) => 
      membershipService.removeMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast({
        title: 'Membro removido',
        description: 'O membro foi removido do grupo com sucesso.',
      });
      setRemovingId(null);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover membro',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      setRemovingId(null);
    },
  });

  const handleRemove = (memberId: string, userId: string) => {
    setRemovingId(memberId);
    removeMutation.mutate({ memberId, userId });
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando membros...</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Membros ({members.length})
        </h3>
        {onAddMember && (
          <Button onClick={onAddMember} size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Adicionar Membro
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Nenhum membro neste grupo ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium">{member.user_name || member.user_email || 'Usuário'}</p>
                <p className="text-sm text-muted-foreground">{member.user_email}</p>
                <p className="text-sm text-muted-foreground">
                  Entrou em {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                </p>
                {member.last_viewed_at && (
                  <p className="text-xs text-muted-foreground">
                    Última visualização: {new Date(member.last_viewed_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(member.user_id, member.user_id)}
                disabled={removingId === member.user_id}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
