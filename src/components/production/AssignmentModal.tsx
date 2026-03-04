/**
 * AssignmentModal Component
 * 
 * Modal for assigning a single production item to a team member.
 * Displays team members with their current workload and includes search/filter functionality.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  workload: number;
}

interface AssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAssignee?: string | null;
  onConfirm: (userId: string, reason?: string) => Promise<void>;
}

export function AssignmentModal({
  open,
  onOpenChange,
  currentAssignee,
  onConfirm
}: AssignmentModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if this is a reassignment
  const isReassignment = currentAssignee && selectedUserId && currentAssignee !== selectedUserId;

  // Set current assignee as default selection
  useEffect(() => {
    if (open && currentAssignee) {
      setSelectedUserId(currentAssignee);
    }
  }, [open, currentAssignee]);

  // Fetch team members when modal opens
  useEffect(() => {
    if (open) {
      fetchTeamMembers();
    }
  }, [open]);

  const fetchTeamMembers = async () => {
    setIsLoading(true);
    try {
      // Fetch all profiles (team members)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch workload for each team member
      const { data: workloadData, error: workloadError } = await supabase
        .from('production_queue')
        .select('assigned_to')
        .not('assigned_to', 'is', null)
        .in('production_status', ['ready_for_production', 'in_production']);

      if (workloadError) throw workloadError;

      // Count workload per team member
      const workloadMap = new Map<string, number>();
      workloadData?.forEach((item) => {
        const count = workloadMap.get(item.assigned_to) || 0;
        workloadMap.set(item.assigned_to, count + 1);
      });

      // Combine profiles with workload
      const members: TeamMember[] = (profiles || []).map((profile) => ({
        id: profile.id,
        name: profile.full_name || profile.email || 'Sem nome',
        email: profile.email || '',
        workload: workloadMap.get(profile.id) || 0,
      }));

      setTeamMembers(members);
    } catch (error) {
      console.error('Erro ao buscar membros da equipe:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter team members based on search term
  const filteredTeamMembers = useMemo(() => {
    if (!searchTerm.trim()) {
      return teamMembers;
    }

    const lowerSearch = searchTerm.toLowerCase();
    return teamMembers.filter(
      (member) =>
        member.name.toLowerCase().includes(lowerSearch) ||
        member.email.toLowerCase().includes(lowerSearch)
    );
  }, [teamMembers, searchTerm]);

  const handleConfirm = async () => {
    if (!selectedUserId) return;

    setIsSubmitting(true);
    try {
      await onConfirm(selectedUserId, reason || undefined);
      onOpenChange(false);
      setSelectedUserId('');
      setSearchTerm('');
      setReason('');
    } catch (error) {
      console.error('Erro ao atribuir item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedUserId('');
    setSearchTerm('');
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Atribuir Item de Produção</DialogTitle>
          <DialogDescription>
            Selecione um membro da equipe para atribuir este item de produção.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Reason Input (for reassignments) */}
          {isReassignment && (
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo da Reatribuição</Label>
              <Input
                id="reason"
                placeholder="Ex: Balanceamento de carga, especialização..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Opcional: Informe o motivo da reatribuição para registro
              </p>
            </div>
          )}

          {/* Team Members List */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTeamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>
                {searchTerm
                  ? 'Nenhum membro encontrado com esse critério'
                  : 'Nenhum membro da equipe encontrado'}
              </p>
            </div>
          ) : (
            <RadioGroup value={selectedUserId} onValueChange={setSelectedUserId}>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {filteredTeamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-accent cursor-pointer"
                    onClick={() => setSelectedUserId(member.id)}
                  >
                    <RadioGroupItem value={member.id} id={member.id} />
                    <Label
                      htmlFor={member.id}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {member.email} • {member.workload}{' '}
                        {member.workload === 1 ? 'item atribuído' : 'itens atribuídos'}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedUserId || isSubmitting}
          >
            {isSubmitting ? 'Atribuindo...' : 'Atribuir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
