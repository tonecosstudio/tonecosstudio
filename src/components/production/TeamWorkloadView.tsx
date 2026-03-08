// @ts-nocheck
/**
 * TeamWorkloadView Component
 * 
 * Displays team members with their current workload, assigned items, and average completion times.
 * Allows load balancing through reassignment of items.
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AssignmentModal } from './AssignmentModal';
import { assignProduction } from '@/services/admin/production-service';
import { Users, ChevronDown, ChevronUp, Clock, Package, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  workload: number;
  items: ProductionQueueItem[];
  averageCompletionTime: number; // in hours
  isOverloaded: boolean;
}

interface ProductionQueueItem {
  id: string;
  order_id: string;
  order_type: 'subscription_delivery' | 'standalone_purchase';
  customer_id: string;
  customer_name: string;
  customer_email: string;
  collection_id: string;
  collection_name: string;
  character_id: string | null;
  character_name: string | null;
  production_status: string;
  current_stage: string;
  choice_status: string;
  choice_deadline: string | null;
  choice_made_at: string | null;
  priority: string;
  priority_score: number;
  scheduled_production_date: string | null;
  estimated_completion_date: string | null;
  assigned_to: string;
  assigned_to_name: string;
  assigned_at: string | null;
  production_started_at: string | null;
  production_completed_at: string | null;
  production_notes: string | null;
  customer_notes: string | null;
  internal_flags: string[];
  created_at: string;
  updated_at: string;
}

interface CompletedItem {
  assigned_to: string;
  production_started_at: string;
  production_completed_at: string;
}

export function TeamWorkloadView() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemAssignee, setSelectedItemAssignee] = useState<string | null>(null);
  const { toast } = useToast();

  // Overall statistics
  const totalItems = useMemo(() => 
    teamMembers.reduce((sum, member) => sum + member.workload, 0), 
    [teamMembers]
  );
  
  const averagePerMember = useMemo(() => 
    teamMembers.length > 0 ? (totalItems / teamMembers.length).toFixed(1) : '0.0',
    [teamMembers, totalItems]
  );
  
  const overallAverageCompletionTime = useMemo(() => {
    const membersWithCompletionTime = teamMembers.filter(m => m.averageCompletionTime > 0);
    if (membersWithCompletionTime.length === 0) return 0;
    
    const total = membersWithCompletionTime.reduce((sum, member) => 
      sum + member.averageCompletionTime, 0
    );
    return total / membersWithCompletionTime.length;
  }, [teamMembers]);

  // Fetch data on component mount
  useEffect(() => {
    fetchTeamWorkload();
  }, []);

  const fetchTeamWorkload = async () => {
    setIsLoading(true);
    try {
      // Fetch all team members (profiles)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch active production items (not completed or cancelled)
      const { data: activeItems, error: itemsError } = await supabase
        .from('production_queue')
        .select('*')
        .not('assigned_to', 'is', null)
        .in('production_status', ['ready_for_production', 'in_production']);

      if (itemsError) throw itemsError;

      // Fetch completed items to calculate average completion times
      const { data: completedItems, error: completedError } = await supabase
        .from('production_queue')
        .select('assigned_to, production_started_at, production_completed_at')
        .not('assigned_to', 'is', null)
        .not('production_started_at', 'is', null)
        .not('production_completed_at', 'is', null);

      if (completedError) throw completedError;

      // Calculate average completion time per team member
      const completionTimesByMember = new Map<string, number[]>();
      (completedItems || []).forEach((item: CompletedItem) => {
        if (item.production_started_at && item.production_completed_at) {
          const start = new Date(item.production_started_at).getTime();
          const end = new Date(item.production_completed_at).getTime();
          const hours = (end - start) / (1000 * 60 * 60);
          
          const times = completionTimesByMember.get(item.assigned_to) || [];
          times.push(hours);
          completionTimesByMember.set(item.assigned_to, times);
        }
      });

      // Group items by assigned team member
      const itemsByMember = new Map<string, ProductionQueueItem[]>();
      (activeItems || []).forEach((item: ProductionQueueItem) => {
        const items = itemsByMember.get(item.assigned_to) || [];
        items.push(item);
        itemsByMember.set(item.assigned_to, items);
      });

      // Calculate average items per member to identify overloaded members
      const totalActiveItems = (activeItems || []).length;
      const avgItemsPerMember = totalActiveItems / (profiles || []).length;
      const overloadThreshold = avgItemsPerMember * 1.5; // 50% above average

      // Build team members array
      const members: TeamMember[] = (profiles || []).map((profile) => {
        const memberItems = itemsByMember.get(profile.id) || [];
        const completionTimes = completionTimesByMember.get(profile.id) || [];
        const avgCompletionTime = completionTimes.length > 0 
          ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
          : 0;

        return {
          id: profile.id,
          name: profile.full_name || profile.email || 'Sem nome',
          email: profile.email || '',
          workload: memberItems.length,
          items: memberItems,
          averageCompletionTime: avgCompletionTime,
          isOverloaded: memberItems.length > overloadThreshold && overloadThreshold > 0,
        };
      });

      // Filter out members with no active items
      const membersWithItems = members.filter(member => member.workload > 0);
      setTeamMembers(membersWithItems);
    } catch (error) {
      console.error('Erro ao buscar carga de trabalho da equipe:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a carga de trabalho da equipe.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReassignClick = (itemId: string, currentAssignee: string) => {
    setSelectedItemId(itemId);
    setSelectedItemAssignee(currentAssignee);
    setAssignmentModalOpen(true);
  };

  const handleAssignmentConfirm = async (userId: string, reason?: string) => {
    if (!selectedItemId) return;

    try {
      await assignProduction(selectedItemId, userId, reason);
      toast({
        title: 'Item reatribuído',
        description: 'O item foi reatribuído com sucesso.',
      });
      
      // Refresh data
      fetchTeamWorkload();
    } catch (error) {
      console.error('Erro ao reatribuir item:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reatribuir o item.',
        variant: 'destructive',
      });
    }
  };

  const toggleMemberExpansion = (memberId: string) => {
    setExpandedMemberId(expandedMemberId === memberId ? null : memberId);
  };

  const getStageDistribution = (items: ProductionQueueItem[]) => {
    const distribution: Record<string, number> = {};
    items.forEach(item => {
      const stage = item.current_stage;
      distribution[stage] = (distribution[stage] || 0) + 1;
    });
    return distribution;
  };

  const formatHours = (hours: number) => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}m`;
    }
    return `${hours.toFixed(1)}h`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
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
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
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

  if (teamMembers.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-medium">Nenhum membro da equipe com itens atribuídos</p>
            <p className="text-sm mt-1">
              Não há itens de produção ativos atribuídos a membros da equipe no momento.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment Modal */}
      <AssignmentModal
        open={assignmentModalOpen}
        onOpenChange={setAssignmentModalOpen}
        currentAssignee={selectedItemAssignee}
        onConfirm={handleAssignmentConfirm}
      />

      {/* Overall Statistics */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Visão Geral da Equipe</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Itens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Itens ativos em produção
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Média por Membro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averagePerMember}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Itens por membro da equipe
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tempo Médio de Conclusão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatHours(overallAverageCompletionTime)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Média de tempo para conclusão
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Team Members List */}
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
                        Média: {formatHours(member.averageCompletionTime)}
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

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t">
                  <div className="p-4 space-y-4">
                    {/* Stage Distribution */}
                    {Object.keys(stageDistribution).length > 0 && (
                      <div>
                        <h5 className="font-medium mb-2">Distribuição por Estágio</h5>
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

                    {/* Assigned Items */}
                    <div>
                      <h5 className="font-medium mb-2">Itens Atribuídos</h5>
                      <div className="space-y-3">
                        {member.items.map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div>
                              <div className="font-medium">{item.customer_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.collection_name} • {item.current_stage}
                              </div>
                              {item.priority === 'high' && (
                                <Badge variant="secondary" className="mt-1">
                                  Alta Prioridade
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
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