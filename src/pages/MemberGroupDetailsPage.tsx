import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { groupService } from '@/lib/services/groupService';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { MemberGroupMessages } from '@/components/groups/MemberGroupMessages';
import { getGroupTypeLabel } from '@/types/groups';

export default function MemberGroupDetailsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupService.getGroupById(groupId!),
    enabled: !!groupId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Grupo não encontrado</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/grupos')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{group.name}</h1>
        <p className="text-muted-foreground mt-1">
          {getGroupTypeLabel(group.type)}
        </p>
      </div>

      <MemberGroupMessages groupId={groupId!} />
    </div>
  );
}
