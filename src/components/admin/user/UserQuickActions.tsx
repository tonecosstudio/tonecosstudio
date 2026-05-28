import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAdminUserActions } from "@/hooks/admin/useAdminUserActions";
import { Key, Mail } from "lucide-react";
import { useState } from "react";

interface UserQuickActionsProps {
  userEmail: string;
  userName: string;
}

export function UserQuickActions({ userEmail, userName }: UserQuickActionsProps) {
  const { toast } = useToast();
  const { openContactEmail, sendPasswordReset } = useAdminUserActions();
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    setIsLoading(true);
    try {
      await sendPasswordReset(userEmail);

      toast({
        title: "Email enviado",
        description: "Email de reset de senha enviado",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao enviar email de reset",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = () => {
    try {
      openContactEmail(userEmail, userName);
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Email invalido para contato",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" size="sm" onClick={handleSendEmail}>
        <Mail className="h-4 w-4 mr-2" />
        Enviar email
      </Button>

      <Button variant="outline" size="sm" onClick={handleResetPassword} disabled={isLoading}>
        <Key className="h-4 w-4 mr-2" />
        {isLoading ? "Enviando..." : "Resetar senha"}
      </Button>
    </div>
  );
}
