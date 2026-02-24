import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, MessageSquare } from 'lucide-react';
import { groupService } from '@/lib/services/groupService';
import { metricsService } from '@/lib/services/metricsService';
import { messageService } from '@/lib/services/messageService';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { GroupWithMetrics } from '@/types/groups';
import { useAuth } from '@/lib/auth';

interface GroupListSidebarProps {
  activeGroupId?: string;
  onGroupSelect: (groupId: string) => void;
  onCreateGroup?: () => void;
}

export function GroupListSidebar({
  activeGroupId,
  onGroupSelect,
  onCreateGroup,
}: GroupListSidebarProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const { data: groups, isLoading } = useQuery<GroupWithMetrics[]>({
    queryKey: ['admin-groups'],
    queryFn: () => groupService.listGroupsWithMetrics(),
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,
  });

  // Prefetch ao passar o mouse
  const handleMouseEnter = (groupId: string) => {
    // Prefetch group details
    queryClient.prefetchQuery({
      queryKey: ['group-details', groupId],
      queryFn: () => groupService.getGroupDetails(groupId),
      staleTime: 5 * 60 * 1000,
    });
    
    // Prefetch metrics
    queryClient.prefetchQuery({
      queryKey: ['group-metrics', groupId],
      queryFn: () => metricsService.getGroupMetrics(groupId),
      staleTime: 5 * 60 * 1000,
    });
    
    // Prefetch messages
    if (user) {
      queryClient.prefetchQuery({
        queryKey: ['group-messages', groupId],
        queryFn: () => messageService.listGroupMessages(groupId, user.id),
        staleTime: 30000,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {groups?.map((group) => (
        <button
          key={group.id}
          onClick={() => onGroupSelect(group.id)}
          onMouseEnter={() => handleMouseEnter(group.id)}
          className={cn(
            'w-full text-left p-3 rounded-lg transition-colors',
            'hover:bg-accent',
            activeGroupId === group.id && 'bg-accent'
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center',
              activeGroupId === group.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}>
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{group.name}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {group.member_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {group.message_count || 0}
                </span>
              </div>
            </div>
          </div>
        </button>
      ))}
      
      {onCreateGroup && (
        <Button
          onClick={onCreateGroup}
          variant="outline"
          className="w-full mt-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Criar Grupo
        </Button>
      )}
    </div>
  );
}
