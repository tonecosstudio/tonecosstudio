import { useEffect, useState } from "react";
import {
  canShowNotifications,
  getNotificationPreferences,
  requestNotificationPermission,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/services/notifications/alert-notification-service";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  browserNotifications: false,
  soundNotifications: false,
  emailDigest: true,
};

export function useProductionNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [hasPermission, setHasPermission] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setPreferences(getNotificationPreferences());
    setHasPermission(canShowNotifications());
  }, []);

  const requestPermission = async () => {
    const granted = await requestNotificationPermission();

    if (granted) {
      setHasPermission(true);
      toast({
        title: "Permissao Concedida",
        description: "Voce recebera notificacoes de alertas criticos.",
      });
    } else {
      toast({
        title: "Permissao Negada",
        description: "Voce precisa permitir notificacoes nas configuracoes do navegador.",
        variant: "destructive",
      });
    }

    return granted;
  };

  const updatePreferences = (nextPreferences: NotificationPreferences, description: string) => {
    setPreferences(nextPreferences);
    saveNotificationPreferences(nextPreferences);

    toast({
      title: "Preferencias Atualizadas",
      description,
    });
  };

  const setBrowserNotifications = async (enabled: boolean) => {
    if (enabled && !hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    updatePreferences(
      { ...preferences, browserNotifications: enabled },
      `Notificacoes do navegador ${enabled ? "ativadas" : "desativadas"}.`
    );
  };

  const setSoundNotifications = (enabled: boolean) => {
    updatePreferences(
      { ...preferences, soundNotifications: enabled },
      `Notificacoes sonoras ${enabled ? "ativadas" : "desativadas"}.`
    );
  };

  const setEmailDigest = (enabled: boolean) => {
    updatePreferences(
      { ...preferences, emailDigest: enabled },
      `Resumo diario por email ${enabled ? "ativado" : "desativado"}.`
    );
  };

  return {
    preferences,
    hasPermission,
    requestPermission,
    setBrowserNotifications,
    setSoundNotifications,
    setEmailDigest,
  };
}
