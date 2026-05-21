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
import { Users } from 'lucide-react';
import { useProductionAssignmentTeamMembers } from '@/hooks/admin/useProductionAssignmentOptions';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: teamMembers = [], isLoading } = useProductionAssignmentTeamMembers(open);

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

  useEffect(() => {
    if (!open) {
      setSelectedUserId('');
    }
  }, [open]);

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
