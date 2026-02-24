import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Trash2, RefreshCw, Users, MessageSquare, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { groupService } from '@/lib/services/groupService';
import { useAuth } from '@/lib/auth';
import { getGroupTypeLabel } from '@/types/groups';
import { toast } from 'sonner';

import { GroupListSidebar } from '@/components/groups/GroupListSidebar';
import { GroupMembersSidebar } from '@/components/groups/GroupMembersSidebar';
import { GroupMessageList } from '@/components/groups/GroupMessageList';
import { SendMessageForm } from '@/components/groups/SendMessageForm';
import { metricsService } from '@/lib/services/metricsService';

/**
 * AdminGroupDetailsPage - Three-column layout for group management
 * 
 * Layout:
 * - Left sidebar: List of all groups
 * - Center: Messages and send form
 * - Right sidebar: Members online/offline
 * 
 * Features:
 * - View group information and metrics in header
 * - Send broadcast messages
 * - View message history
 * - See members status
 * - Delete group
 */
export default function AdminGroupDetailsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch group details with optimized caching
  const {
    data: group,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['group-details', groupId],
    queryFn: () => groupService.getGroupDetails(groupId!),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (anteriormente cacheTime)
    refetchOnWindowFocus: false,
  });

  // Fetch group metrics with optimized caching
  const { data: metrics } = useQuery({
    queryKey: ['group-metrics', groupId],
    queryFn: () => metricsService.getGroupMetrics(groupId!),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Delete group mutation
  const deleteMutation = useMutation({
    mutationFn: () => groupService.deleteGroup(groupId!, user!.id),
    onSuccess: () => {
      toast.success('Grupo deletado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      navigate('/admin/grupos');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao deletar grupo'
      );
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  // Loading state - Skeleton ao invés de spinner
  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        {/* Left Sidebar Skeleton */}
        <div className="w-64 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex-1 p-2 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>

        {/* Center Skeleton */}
        <div className="flex-1 flex flex-col">
          <div className="border-b bg-card p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="flex-1">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="flex gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-32 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
          <div className="flex-1 p-6 bg-gray-50 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className="w-2/3 h-24 bg-white rounded-lg animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar Skeleton */}
        <div className="w-80 border-l bg-card flex flex-col">
          <div className="p-4 border-b">
            <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex-1 p-2 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !group) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="bg-destructive/10 text-destructive px-6 py-4 rounded-lg max-w-md">
          <p className="font-medium">Erro ao carregar grupo</p>
          <p className="text-sm mt-1">
            {error instanceof Error ? error.message : 'Grupo não encontrado'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Groups List */}
      <div className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Grupos de Broadcast</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <GroupListSidebar 
            activeGroupId={groupId} 
            onGroupSelect={(id) => navigate(`/admin/grupos/${id}`)} 
          />
        </div>
      </div>

      {/* Center - Messages Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with metrics */}
        <div className="border-b bg-card">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">{group.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {getGroupTypeLabel(group.type)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Metrics Bar */}
            {metrics && (
              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Membros Ativos:</span>
                  <span className="font-semibold">{metrics.total_members}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Mensagens Enviadas:</span>
                  <span className="font-semibold">{metrics.total_messages}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Taxa de Abertura:</span>
                  <span className="font-semibold text-green-600">
                    {Math.round(metrics.estimated_view_rate)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <GroupMessageList groupId={groupId!} />
        </div>

        {/* Send Message Form */}
        <div className="border-t bg-card p-4">
          <SendMessageForm groupId={groupId!} />
        </div>
      </div>

      {/* Right Sidebar - Members */}
      <div className="w-80 border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Membros ({metrics?.total_members || 0})</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <GroupMembersSidebar groupId={groupId!} />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Grupo</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Tem certeza que deseja deletar o grupo <strong>{group.name}</strong>?
              </p>
              <p className="text-sm">Esta ação irá:</p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>Ocultar o grupo de todos os usuários</li>
                <li>Preservar o histórico de mensagens para auditoria</li>
                <li>Impedir novos envios de mensagens</li>
              </ul>
              <p className="text-sm font-medium mt-3">
                Os dados não serão permanentemente deletados e podem ser recuperados se necessário.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deletando...' : 'Deletar Grupo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
