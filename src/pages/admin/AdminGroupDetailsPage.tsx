import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { groupService } from '@/lib/services/groupService';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { GroupMetrics } from '@/components/groups/GroupMetrics';
import { GroupMembersList } from '@/components/groups/GroupMembersList';
import { AddMemberModal } from '@/components/groups/AddMemberModal';
import { GroupMessageList } from '@/components/groups/GroupMessageList';
import { SendMessageForm } from '@/components/groups/SendMessageForm';
import { getGroupTypeLabel } from '@/types/groups';

export default function AdminGroupDetailsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

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
    <div className="container mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate('/admin/groups')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{group.name}</h1>
        <p className="text-muted-foreground mt-1">
          Tipo: {getGroupTypeLabel(group.type)}
        </p>
      </div>

      <div className="space-y-6">
        <GroupMetrics groupId={groupId!} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <SendMessageForm groupId={groupId!} />
            <GroupMessageList groupId={groupId!} />
          </div>

          <div>
            <GroupMembersList
              groupId={groupId!}
              onAddMember={() => setIsAddMemberModalOpen(true)}
            />
          </div>
        </div>
      </div>

      <AddMemberModal
        groupId={groupId!}
        open={isAddMemberModalOpen}
        onOpenChange={setIsAddMemberModalOpen}
      />
    </div>
  );
}
