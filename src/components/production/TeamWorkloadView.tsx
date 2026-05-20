/**
 * TeamWorkloadView Component
 *
 * Displays team members with their current workload, assigned items, and average completion times.
 * Allows load balancing through reassignment of items.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AssignmentModal } from "./AssignmentModal";
import { Users, ChevronDown, ChevronUp, Clock, Package, AlertTriangle } from "lucide-react";
import {
  useReassignProductionItem,
  useTeamWorkload,
  type TeamWorkloadItem,
} from "@/hooks/admin/useTeamWorkload";

export function TeamWorkloadView() {
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemAssignee, setSelectedItemAssignee] = useState<string | null>(null);
  const { toast } = useToast();
  const teamWorkloadQuery = useTeamWorkload();
  const reassignMutation = useReassignProductionItem();
  const teamMembers = useMemo(() => teamWorkloadQuery.data ?? [], [teamWorkloadQuery.data]);

  const totalItems = useMemo(
    () => teamMembers.reduce((sum, member) => sum + member.workload, 0),
    [teamMembers]
  );

  const averagePerMember = useMemo(
    () => (teamMembers.length > 0 ? (totalItems / teamMembers.length).toFixed(1) : "0.0"),
    [teamMembers, totalItems]
  );

  const overallAverageCompletionTime = useMemo(() => {
    const membersWithCompletionTime = teamMembers.filter(
      (member) => member.averageCompletionTime > 0
    );

    if (membersWithCompletionTime.length === 0) return 0;

    const total = membersWithCompletionTime.reduce(
      (sum, member) => sum + member.averageCompletionTime,
      0
    );
    return total / membersWithCompletionTime.length;
  }, [teamMembers]);

  const handleReassignClick = (itemId: string, currentAssignee: string | null) => {
    setSelectedItemId(itemId);
    setSelectedItemAssignee(currentAssignee);
    setAssignmentModalOpen(true);
  };

  const handleAssignmentConfirm = async (userId: string, reason?: string) => {
    if (!selectedItemId) return;

    try {
      await reassignMutation.mutateAsync({ itemId: selectedItemId, userId, reason });
      toast({
        title: "Item reatribuido",
        description: "O item foi reatribuido com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao reatribuir item:", error);
      toast({
        title: "Erro",
        description: "Nao foi possivel reatribuir o item.",
        variant: "destructive",
      });
    }
  };

  const toggleMemberExpansion = (memberId: string) => {
    setExpandedMemberId(expandedMemberId === memberId ? null : memberId);
  };

  const getStageDistribution = (items: TeamWorkloadItem[]) => {
    const distribution: Record<string, number> = {};

    items.forEach((item) => {
      const stage = item.current_stage || "Sem estagio";
      distribution[stage] = (distribution[stage] || 0) + 1;
    });

    return distribution;
  };

  const isHighPriority = (priority: TeamWorkloadItem["priority"]) =>
    priority === "high" ||
    priority === "critical" ||
    (typeof priority === "number" && priority >= 75);

  const formatHours = (hours: number) => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}m`;
    }

    return `${hours.toFixed(1)}h`;
  };

  if (teamWorkloadQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (teamWorkloadQuery.isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-medium">Erro ao carregar carga da equipe</p>
            <p className="text-sm mt-1">
              Nao foi possivel carregar a carga de trabalho da equipe.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-medium">Nenhum membro da equipe com itens atribuidos</p>
            <p className="text-sm mt-1">
              Nao ha itens de producao ativos atribuidos a membros da equipe no momento.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <AssignmentModal
        open={assignmentModalOpen}
        onOpenChange={setAssignmentModalOpen}
        currentAssignee={selectedItemAssignee}
        onConfirm={handleAssignmentConfirm}
      />

      <div>
        <h2 className="text-2xl font-bold mb-4">Visao Geral da Equipe</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Itens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground mt-1">Itens ativos em producao</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Media por Membro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averagePerMember}</div>
              <p className="text-xs text-muted-foreground mt-1">Itens por membro da equipe</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tempo Medio de Conclusao
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatHours(overallAverageCompletionTime)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Media de tempo para conclusao
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Membros da Equipe</h3>

        {teamMembers.map((member) => {
          const isExpanded = expandedMemberId === member.id;
          const stageDistribution = getStageDistribution(member.items);

          return (
            <Card key={member.id} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => toggleMemberExpansion(member.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{member.name}</h4>
                        {member.isOverloaded && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Sobrecarregado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">{member.workload} itens</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Media: {formatHours(member.averageCompletionTime)}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t">
                  <div className="p-4 space-y-4">
                    {Object.keys(stageDistribution).length > 0 && (
                      <div>
                        <h5 className="font-medium mb-2">Distribuicao por Estagio</h5>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(stageDistribution).map(([stage, count]) => (
                            <Badge key={stage} variant="outline" className="gap-1">
                              <Package className="h-3 w-3" />
                              {stage}: {count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h5 className="font-medium mb-2">Itens Atribuidos</h5>
                      <div className="space-y-3">
                        {member.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div>
                              <div className="font-medium">
                                {item.customer_name || "Cliente nao identificado"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {item.collection_name || "Colecao nao definida"} -{" "}
                                {item.current_stage || "Sem estagio"}
                              </div>
                              {isHighPriority(item.priority) && (
                                <Badge variant="secondary" className="mt-1">
                                  Alta Prioridade
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleReassignClick(item.id, item.assigned_to);
                              }}
                            >
                              Reatribuir
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
