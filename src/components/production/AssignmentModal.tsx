import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useProductionAssignmentTeamMembers } from "@/hooks/admin/useProductionAssignmentOptions";

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
  onConfirm,
}: AssignmentModalProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: teamMembers = [], isLoading } = useProductionAssignmentTeamMembers(open);
  const isReassignment = Boolean(
    currentAssignee && selectedUserId && currentAssignee !== selectedUserId
  );

  useEffect(() => {
    if (open && currentAssignee) {
      setSelectedUserId(currentAssignee);
    }
  }, [open, currentAssignee]);

  const filteredTeamMembers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return teamMembers;
    }

    return teamMembers.filter(
      (member) =>
        member.name.toLowerCase().includes(normalizedSearch) ||
        member.email.toLowerCase().includes(normalizedSearch)
    );
  }, [teamMembers, searchTerm]);

  const resetForm = () => {
    setSelectedUserId("");
    setSearchTerm("");
    setReason("");
  };

  const handleConfirm = async () => {
    if (!selectedUserId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(selectedUserId, reason.trim() || undefined);
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Atribuir Item de Producao</DialogTitle>
          <DialogDescription>
            Selecione um membro da equipe para atribuir este item de producao.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-9"
            />
          </div>

          {isReassignment && (
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo da Reatribuicao</Label>
              <Input
                id="reason"
                placeholder="Ex: Balanceamento de carga, especializacao..."
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Opcional: informe o motivo da reatribuicao para registro.
              </p>
            </div>
          )}

          {isLoading ? (
            <AssignmentModalSkeleton />
          ) : filteredTeamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>
                {searchTerm
                  ? "Nenhum membro encontrado com esse criterio"
                  : "Nenhum membro da equipe encontrado"}
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
                    <Label htmlFor={member.id} className="flex-1 cursor-pointer">
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {member.email} - {member.workload}{" "}
                        {member.workload === 1 ? "item atribuido" : "itens atribuidos"}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedUserId || isSubmitting}>
            {isSubmitting ? "Atribuindo..." : "Atribuir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentModalSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}
