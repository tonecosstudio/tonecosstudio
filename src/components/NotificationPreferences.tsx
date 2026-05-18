/**
 * Notification Preferences Component
 *
 * Allows users to manage their email notification preferences.
 */

import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useNotificationPreferences,
  type NotificationPreferenceEntity,
} from "@/hooks/useNotificationPreferences";
import { Loader2, Mail, Bell, BellOff } from "lucide-react";

export function NotificationPreferences() {
  const { toast } = useToast();
  const {
    preferences,
    loading,
    saving,
    loadPreferences,
    updatePreference,
    enableAll,
    disableAll,
  } = useNotificationPreferences();

  useEffect(() => {
    loadPreferences().then((status) => {
      if (status === "unauthorized") {
        toast({
          title: "Erro",
          description: "VocÃª precisa estar logado para ver suas preferÃªncias",
          variant: "destructive",
        });
      } else if (status === "error") {
        toast({
          title: "Erro",
          description: "NÃ£o foi possÃ­vel carregar suas preferÃªncias",
          variant: "destructive",
        });
      }
    });
  }, [loadPreferences, toast]);

  const handleUpdatePreference = async (
    field: keyof NotificationPreferenceEntity,
    value: boolean,
  ) => {
    const status = await updatePreference(field, value);
    if (status === "ok") {
      toast({
        title: "PreferÃªncias atualizadas",
        description: "Suas preferÃªncias de notificaÃ§Ã£o foram salvas",
      });
      return;
    }
    toast({
      title: "Erro",
      description: "NÃ£o foi possÃ­vel atualizar suas preferÃªncias",
      variant: "destructive",
    });
  };

  const handleEnableAll = async () => {
    const status = await enableAll();
    if (status === "ok") {
      toast({
        title: "Todas as notificaÃ§Ãµes ativadas",
        description: "VocÃª receberÃ¡ todos os tipos de email",
      });
      return;
    }
    toast({
      title: "Erro",
      description: "NÃ£o foi possÃ­vel ativar todas as notificaÃ§Ãµes",
      variant: "destructive",
    });
  };

  const handleDisableAll = async () => {
    const status = await disableAll();
    if (status === "ok") {
      toast({
        title: "Todas as notificaÃ§Ãµes desativadas",
        description: "VocÃª nÃ£o receberÃ¡ mais emails automÃ¡ticos",
      });
      return;
    }
    toast({
      title: "Erro",
      description: "NÃ£o foi possÃ­vel desativar todas as notificaÃ§Ãµes",
      variant: "destructive",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            NÃ£o foi possÃ­vel carregar suas preferÃªncias
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <CardTitle>PreferÃªncias de NotificaÃ§Ã£o</CardTitle>
        </div>
        <CardDescription>Escolha quais emails vocÃª deseja receber</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnableAll}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Ativar Todas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisableAll}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <BellOff className="h-4 w-4" />
            Desativar Todas
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="welcome_emails" className="flex flex-col space-y-1">
              <span className="font-medium">Emails de Boas-vindas</span>
              <span className="text-sm text-muted-foreground">
                Receba confirmaÃ§Ã£o quando assinar o serviÃ§o
              </span>
            </Label>
            <Switch
              id="welcome_emails"
              checked={preferences.welcome_emails}
              onCheckedChange={(checked) => handleUpdatePreference("welcome_emails", checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="reminder_emails" className="flex flex-col space-y-1">
              <span className="font-medium">Lembretes de Escolha</span>
              <span className="text-sm text-muted-foreground">
                Receba lembretes para escolher sua coleÃ§Ã£o todo mÃªs
              </span>
            </Label>
            <Switch
              id="reminder_emails"
              checked={preferences.reminder_emails}
              onCheckedChange={(checked) => handleUpdatePreference("reminder_emails", checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="revelation_emails" className="flex flex-col space-y-1">
              <span className="font-medium">RevelaÃ§Ã£o de Personagens</span>
              <span className="text-sm text-muted-foreground">
                Receba notificaÃ§Ã£o quando o personagem for revelado
              </span>
            </Label>
            <Switch
              id="revelation_emails"
              checked={preferences.revelation_emails}
              onCheckedChange={(checked) => handleUpdatePreference("revelation_emails", checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="shipping_emails" className="flex flex-col space-y-1">
              <span className="font-medium">NotificaÃ§Ãµes de Envio</span>
              <span className="text-sm text-muted-foreground">
                Receba atualizaÃ§Ãµes sobre produÃ§Ã£o e rastreamento
              </span>
            </Label>
            <Switch
              id="shipping_emails"
              checked={preferences.shipping_emails}
              onCheckedChange={(checked) => handleUpdatePreference("shipping_emails", checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="payment_emails" className="flex flex-col space-y-1">
              <span className="font-medium">Lembretes de Pagamento</span>
              <span className="text-sm text-muted-foreground">
                Receba lembretes sobre pagamentos pendentes
              </span>
            </Label>
            <Switch
              id="payment_emails"
              checked={preferences.payment_emails}
              onCheckedChange={(checked) => handleUpdatePreference("payment_emails", checked)}
              disabled={saving}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Nota: Emails importantes relacionados a seguranÃ§a e transaÃ§Ãµes sempre serÃ£o enviados,
          independente dessas configuraÃ§Ãµes.
        </p>
      </CardContent>
    </Card>
  );
}
