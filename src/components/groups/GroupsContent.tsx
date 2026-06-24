import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, RefreshCw, Users, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { groupService } from "@/services/groups/group-service";
import { GroupList } from "@/components/groups/GroupList";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { AutomaticGroupsManager } from "@/components/groups/AutomaticGroupsManager";
import { adminGroupDetailsPath } from "@/config/routes";

interface GroupsContentProps {
  showHeader?: boolean;
}

/**
 * GroupsContent - Conteúdo reutilizável da página de grupos
 *
 * Pode ser usado:
 * - Na pagina standalone de grupos (com header)
 * - Dentro da aba de grupos na Central de Comunicação (sem header)
 */
export function GroupsContent({ showHeader = true }: GroupsContentProps) {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const {
    data: groups = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: () => groupService.listGroupsWithMetrics(),
    staleTime: 30000, // 30 seconds
  });

  const handleGroupSelect = (groupId: string) => {
    navigate(adminGroupDetailsPath(groupId));
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    refetch();
  };

  // Calculate summary metrics
  const totalGroups = groups.length;
  const totalMembers = groups.reduce((sum, g) => sum + (g.member_count || 0), 0);
  const totalMessages = groups.reduce((sum, g) => sum + (g.message_count || 0), 0);
  const avgMembersPerGroup = totalGroups > 0 ? Math.round(totalMembers / totalGroups) : 0;

  return (
    <div className="space-y-6">
      {/* Header (opcional) */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Grupos de Broadcast</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie grupos e envie mensagens para segmentos de clientes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Grupo
            </Button>
          </div>
        </div>
      )}

      {/* Header compacto para uso em aba */}
      {!showHeader && (
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Grupos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGroups}</div>
            <p className="text-xs text-muted-foreground">
              {avgMembersPerGroup} membros/grupo em média
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">Alcance total dos grupos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Enviadas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMessages}</div>
            <p className="text-xs text-muted-foreground">Total de comunicações</p>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-6">
          <p className="font-medium">Erro ao carregar grupos</p>
          <p className="text-sm mt-1">
            {error instanceof Error ? error.message : "Erro desconhecido"}
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
