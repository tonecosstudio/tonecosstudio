/**
 * BulkAssignModal Component
 * 
 * Modal for assigning multiple production items to a team member.
 * Displays team members with their current workload.
 */

import { useState, useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  workload: number;
}

interface BulkAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (userId: string) => Promise<void>;
}

export function BulkAssignModal({
  open,
  onOpenChange,
  selectedCount,
  onConfirm
}: BulkAssignModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleConfirm = async () => {
    if (!selectedUserId) return;

    setIsSubmitting(true);
    try {
      await onConfirm(selectedUserId);
      onOpenChange(false);
      setSelectedUserId('');
    } catch (error) {
      console.error('Erro ao atribuir itens:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Atribuir Itens em Massa</DialogTitle>
          <DialogDescription>
            Selecione um membro da equipe para atribuir {selectedCount}{' '}
            {selectedCount === 1 ? 'item' : 'itens'}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
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
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum membro da equipe encontrado</p>
            </div>
          ) : (
            <RadioGroup value={selectedUserId} onValueChange={setSelectedUserId}>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {teamMembers.map((member) => (
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
            onClick={() => onOpenChange(false)}
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
