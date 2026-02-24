import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { membershipService } from "@/lib/services/membershipService";
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
import { useToast } from "@/hooks/use-toast";

interface AddMemberModalProps {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberModal({ groupId, open, onOpenChange }: AddMemberModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");

  const addMutation = useMutation({
    mutationFn: () => membershipService.addMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      toast({
        title: "Membro adicionado",
        description: "O membro foi adicionado ao grupo com sucesso.",
      });
      setUserId("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar membro",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      toast({
        title: "ID do usuário obrigatório",
        description: "Por favor, informe o ID do usuário.",
        variant: "destructive",
      });
      return;
    }
    addMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Membro</DialogTitle>
          <DialogDescription>
            Adicione um novo membro ao grupo informando o ID do usuário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userId">ID do Usuário</Label>
              <Input
                id="userId"
                placeholder="Digite o ID do usuário"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={addMutation.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
