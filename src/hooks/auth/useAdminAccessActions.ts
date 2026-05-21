import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  bootstrapInitialAdmin,
  signOutCurrentUser,
} from "@/services/auth/admin-access-service";

interface UseAdminAccessActionsOptions {
  onBootstrapSuccess?: () => void;
}

export function useAdminAccessActions(options: UseAdminAccessActionsOptions = {}) {
  const { toast } = useToast();

  const bootstrapMutation = useMutation({
    mutationFn: bootstrapInitialAdmin,
    onSuccess: (data) => {
      if (data.ok) {
        toast({ title: "Pronto!", description: "Voce virou admin inicial." });
        options.onBootstrapSuccess?.();
        return;
      }

      toast({
        title: "Sem permissao",
        description: data.error ?? "Voce nao e admin.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao criar admin inicial",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const signOutMutation = useMutation({
    mutationFn: signOutCurrentUser,
    onError: (error: Error) => {
      toast({
        title: "Falha ao sair",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    bootstrap: () => bootstrapMutation.mutate(),
    signOut: () => signOutMutation.mutate(),
    isBootstrapping: bootstrapMutation.isPending,
    isSigningOut: signOutMutation.isPending,
  };
}
