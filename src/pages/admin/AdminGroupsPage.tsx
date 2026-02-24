import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { groupService } from '@/lib/services/groupService';
import { GroupList } from '@/components/groups/GroupList';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { AutomaticGroupsManager } from '@/components/groups/AutomaticGroupsManager';

/**
 * AdminGroupsPage - Main page for managing broadcast groups
 * 
 * Features:
 * - List all groups with metrics
 * - Create new groups
 * - Navigate to group details
 * - Delete groups (soft delete)
 */
export default function AdminGroupsPage() {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const {
    data: groups = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: () => groupService.listGroupsWithMetrics(),
    staleTime: 30000, // 30 seconds
  });

  const handleGroupSelect = (groupId: string) => {
    navigate(`/admin/grupos/${groupId}`);
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    refetch();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grupos de Broadcast</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie grupos e envie mensagens para segmentos de clientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-6">
          <p className="font-medium">Erro ao carregar grupos</p>
          <p className="text-sm mt-1">
            {error instanceof Error ? error.message : 'Erro desconhecido'}
          </p>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="groups" className="space-y-6">
        <TabsList>
          <TabsTrigger value="groups">Todos os Grupos</TabsTrigger>
          <TabsTrigger value="automatic">Sincronização Automática</TabsTrigger>
        </TabsList>

        <TabsContent value="groups">
          <GroupList
            groups={groups}
            isLoading={isLoading}
            onSelectGroup={handleGroupSelect}
            onRefresh={refetch}
          />
        </TabsContent>

        <TabsContent value="automatic">
          <AutomaticGroupsManager />
        </TabsContent>
      </Tabs>

      {/* Create Group Modal */}
      <CreateGroupModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
