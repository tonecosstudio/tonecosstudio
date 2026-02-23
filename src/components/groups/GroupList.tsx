import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Users, MessageSquare, Clock, RefreshCw } from "lucide-react";
import { groupService } from "@/lib/services/groupService";
import type { Group } from "@/types/groups";
import { getGroupTypeLabel } from "@/types/groups";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

interface GroupListProps {
  onCreateGroup?: () => void;
  onSelectGroup?: (groupId: string) => void;
}

interface GroupWithMetrics extends Group {
  member_count?: number;
  message_count?: number;
  last_message_at?: string | null;
}

export function GroupList({ onCreateGroup, onSelectGroup }: GroupListProps) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await groupService.listGroups(false);
      
      // Enriquecer com métricas básicas
      const enrichedGroups = await Promise.all(
        data.map(async (group) => {
          try {
            const details = await groupService.getGroupDetails(group.id);
            return {
              ...group,
              member_count: details.member_count,
              message_count: details.message_count,
              last_message_at: details.last_message_at,
            };
          } catch (error) {
            console.error(`Erro ao carregar detalhes do grupo ${group.id}:`, error);
            return {
              ...group,
              member_count: 0,
              message_count: 0,
              last_message_at: null,
            };
          }
        })
      );
      
      setGroups(enrichedGroups);
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
      toast.error("Erro ao carregar grupos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleDeleteClick = (group: Group) => {
    setGroupToDelete(group);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!groupToDelete || !user) return;

    try {
      setDeleting(true);
      await groupService.deleteGroup(groupToDelete.id, user.id);
      toast.success(`Grupo "${groupToDelete.name}" deletado com sucesso`);
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
      await loadGroups();
    } catch (error) {
      console.error("Erro ao deletar grupo:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao deletar grupo");
    } finally {
      setDeleting(false);
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "Nunca";
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return timestamp;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando grupos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com botão de criar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Grupos de Broadcast</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie grupos e envie mensagens para seus clientes
          </p>
        </div>
        {onCreateGroup && (
          <Button onClick={onCreateGroup}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Grupo
          </Button>
        )}
      </div>

      {/* Empty state */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum grupo criado</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Crie seu primeiro grupo para começar a enviar mensagens broadcast
            </p>
            {onCreateGroup && (
              <Button onClick={onCreateGroup}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Grupo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Lista de grupos */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card
              key={group.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectGroup?.(group.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{group.name}</CardTitle>
                    <Badge variant="outline" className="mt-2">
                      {getGroupTypeLabel(group.type)}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(group);
                    }}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Métricas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{group.member_count || 0}</span>
                    <span className="text-muted-foreground">membros</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{group.message_count || 0}</span>
                    <span className="text-muted-foreground">mensagens</span>
                  </div>
                </div>

                {/* Última mensagem */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <Clock className="h-3 w-3" />
                  <span>Última mensagem: {formatTimestamp(group.last_message_at || null)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de confirmação de delete */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o grupo "{groupToDelete?.name}"?
              <br />
              <br />
              Esta ação irá:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Ocultar o grupo de todos os usuários</li>
                <li>Preservar o histórico de mensagens para auditoria</li>
                <li>Impedir novos envios de mensagens</li>
              </ul>
              <br />
              Os dados não serão permanentemente deletados e podem ser recuperados se necessário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deletando..." : "Deletar Grupo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
