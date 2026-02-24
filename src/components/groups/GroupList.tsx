import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, MessageSquare, Clock, Trash2, MoreVertical } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import { groupService } from "@/lib/services/groupService";
import { useAuth } from "@/lib/auth";
import { getGroupTypeLabel } from "@/types/groups";
import type { GroupWithMetrics } from "@/types/groups";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GroupListProps {
  groups: GroupWithMetrics[];
  isLoading: boolean;
  onSelectGroup: (groupId: string) => void;
  onRefresh: () => void;
}

/**
 * GroupList - Displays a grid of group cards with metrics
 *
 * Features:
 * - Grid layout with responsive columns
 * - Group metrics (members, messages, last activity)
 * - Delete action with confirmation
 * - Empty state
 * - Loading state
 */
export function GroupList({ groups, isLoading, onSelectGroup, onRefresh }: GroupListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<GroupWithMetrics | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (groupId: string) => groupService.deleteGroup(groupId, user!.id),
    onSuccess: () => {
      toast.success("Grupo deletado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-groups"] });
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
      onRefresh();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao deletar grupo");
    },
  });

  const handleDeleteClick = (group: GroupWithMetrics, e: React.MouseEvent) => {
    e.stopPropagation();
    setGroupToDelete(group);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (groupToDelete) {
      deleteMutation.mutate(groupToDelete.id);
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
      return "Data inválida";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-6 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Empty state
  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-6 mb-4">
            <Users className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Nenhum grupo criado</h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Crie seu primeiro grupo para começar a enviar mensagens broadcast para seus clientes
          </p>
        </CardContent>
      </Card>
    );
  }

  // Groups grid
  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <Card
            key={group.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]",
              "active:scale-[0.98]"
            )}
            onClick={() => onSelectGroup(group.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate mb-2">{group.name}</CardTitle>
                  <Badge variant="outline" className="font-normal">
                    {getGroupTypeLabel(group.type)}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => handleDeleteClick(group, e)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deletar Grupo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{group.member_count || 0}</p>
                    <p className="text-xs text-muted-foreground">membros</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-blue-500/10 p-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{group.message_count || 0}</p>
                    <p className="text-xs text-muted-foreground">mensagens</p>
                  </div>
                </div>
              </div>

              {/* Last activity */}
              <div className="flex items-center gap-2 pt-3 border-t text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Última mensagem: {formatTimestamp(group.last_message_at || null)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Grupo</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Tem certeza que deseja deletar o grupo <strong>{groupToDelete?.name}</strong>?
              </p>
              <p className="text-sm">Esta ação irá:</p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>Ocultar o grupo de todos os usuários</li>
                <li>Preservar o histórico de mensagens para auditoria</li>
                <li>Impedir novos envios de mensagens</li>
              </ul>
              <p className="text-sm font-medium mt-3">
                Os dados não serão permanentemente deletados.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deletando..." : "Deletar Grupo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
