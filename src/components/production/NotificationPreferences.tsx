/**
 * Notification Preferences Component
 * 
 * Allows users to configure their notification preferences for production alerts.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Volume2, Mail } from "lucide-react";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  requestNotificationPermission,
  canShowNotifications,
  type NotificationPreferences as NotificationPreferencesType,
} from "@/services/notifications/alert-notification-service";
import { useToast } from "@/hooks/use-toast";

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferencesType>({
    browserNotifications: false,
    soundNotifications: false,
    emailDigest: true,
  });
  const [hasPermission, setHasPermission] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load preferences from localStorage
    const savedPreferences = getNotificationPreferences();
    setPreferences(savedPreferences);
    
    // Check notification permission
    setHasPermission(canShowNotifications());
  }, []);

  const handleBrowserNotificationToggle = async (enabled: boolean) => {
    if (enabled && !hasPermission) {
      // Request permission
      const granted = await requestNotificationPermission();
      
      if (!granted) {
        toast({
          title: "Permissão Negada",
          description: "Você precisa permitir notificações nas configurações do navegador.",
          variant: "destructive",
        });
        return;
      }
      
      setHasPermission(true);
    }

    const newPreferences = {
      ...preferences,
      browserNotifications: enabled,
    };
    
    setPreferences(newPreferences);
    saveNotificationPreferences(newPreferences);
    
    toast({
      title: "Preferências Atualizadas",
      description: `Notificações do navegador ${enabled ? "ativadas" : "desativadas"}.`,
    });
  };

  const handleSoundNotificationToggle = (enabled: boolean) => {
    const newPreferences = {
      ...preferences,
      soundNotifications: enabled,
    };
    
    setPreferences(newPreferences);
    saveNotificationPreferences(newPreferences);
    
    toast({
      title: "Preferências Atualizadas",
      description: `Notificações sonoras ${enabled ? "ativadas" : "desativadas"}.`,
    });
  };

  const handleEmailDigestToggle = (enabled: boolean) => {
    const newPreferences = {
      ...preferences,
      emailDigest: enabled,
    };
    
    setPreferences(newPreferences);
    saveNotificationPreferences(newPreferences);
    
    toast({
      title: "Preferências Atualizadas",
      description: `Resumo diário por email ${enabled ? "ativado" : "desativado"}.`,
    });
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    
    if (granted) {
      setHasPermission(true);
      toast({
        title: "Permissão Concedida",
        description: "Você receberá notificações de alertas críticos.",
      });
    } else {
      toast({
        title: "Permissão Negada",
        description: "Você precisa permitir notificações nas configurações do navegador.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Preferências de Notificação
        </CardTitle>
        <CardDescription>
          Configure como você deseja receber alertas sobre itens críticos na produção.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Browser Notifications */}
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-3 flex-1">
            <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="browser-notifications" className="text-base font-medium">
                Notificações do Navegador
              </Label>
              <p className="text-sm text-muted-foreground">
                Receba alertas em tempo real para itens críticos (prazo &lt; 24h, bloqueios, etc.)
              </p>
              {!hasPermission && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRequestPermission}
                  className="mt-2"
                >
                  Permitir Notificações
                </Button>
              )}
            </div>
          </div>
          <Switch
            id="browser-notifications"
            checked={preferences.browserNotifications}
            onCheckedChange={handleBrowserNotificationToggle}
            disabled={!hasPermission && !preferences.browserNotifications}
          />
        </div>

        {/* Sound Notifications */}
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-3 flex-1">
            <Volume2 className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="sound-notifications" className="text-base font-medium">
                Notificações Sonoras
              </Label>
              <p className="text-sm text-muted-foreground">
                Reproduzir um som quando novos alertas críticos aparecerem
              </p>
            </div>
          </div>
          <Switch
            id="sound-notifications"
            checked={preferences.soundNotifications}
            onCheckedChange={handleSoundNotificationToggle}
          />
        </div>

        {/* Email Digest */}
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-3 flex-1">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="email-digest" className="text-base font-medium">
                Resumo Diário por Email
              </Label>
              <p className="text-sm text-muted-foreground">
                Receba um resumo diário de todos os alertas e itens pendentes por email
              </p>
            </div>
          </div>
          <Switch
            id="email-digest"
            checked={preferences.emailDigest}
            onCheckedChange={handleEmailDigestToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
