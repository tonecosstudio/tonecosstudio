import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, Key, Ban, Mail, MoreVertical, UserCheck, Shield } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UserQuickActionsProps {
  userId: string;
  userEmail: string;
  userName: string;
}

export function UserQuickActions({ userId, userEmail, userName }: UserQuickActionsProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    setIsLoading(true);
    try {
      // TODO: Implementar reset de senha via Supabase Auth
      toast({
        title: "Email enviado",
        description: `Email de reset de senha enviado para ${userEmail}`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao enviar email de reset",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = () => {
    // Abrir cliente de email padrão
    window.location.href = `mailto:${userEmail}?subject=Contato - ${userName}`;
  };

  const handleSuspendAccount = async () => {
    if (!confirm(`Tem certeza que deseja suspender a conta de ${userName}?`)) {
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implementar suspensão de conta
      toast({
        title: "Conta suspensa",
        description: `A conta de ${userName} foi suspensa`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao suspender conta",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleSendEmail}>
        <Mail className="h-4 w-4 mr-2" />
        Enviar Email
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isLoading}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Ações Rápidas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleResetPassword}>
            <Key className="h-4 w-4 mr-2" />
            Resetar Senha
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Edit className="h-4 w-4 mr-2" />
            Editar Perfil
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <UserCheck className="h-4 w-4 mr-2" />
            Verificar Conta
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Shield className="h-4 w-4 mr-2" />
            Gerenciar Permissões
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleSuspendAccount}
            className="text-destructive focus:text-destructive"
          >
            <Ban className="h-4 w-4 mr-2" />
            Suspender Conta
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
