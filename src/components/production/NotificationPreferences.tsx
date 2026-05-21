/**
 * Notification Preferences Component
 *
 * Allows users to configure their notification preferences for production alerts.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Volume2, Mail } from "lucide-react";
import { useProductionNotificationPreferences } from "@/hooks/production/useProductionNotificationPreferences";

export function NotificationPreferences() {
  const {
    preferences,
    hasPermission,
    requestPermission,
    setBrowserNotifications,
    setSoundNotifications,
    setEmailDigest,
  } = useProductionNotificationPreferences();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Preferencias de Notificacao
        </CardTitle>
        <CardDescription>
          Configure como voce deseja receber alertas sobre itens criticos na producao.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-3 flex-1">
            <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="browser-notifications" className="text-base font-medium">
                Notificacoes do Navegador
              </Label>
              <p className="text-sm text-muted-foreground">
                Receba alertas em tempo real para itens criticos (prazo &lt; 24h, bloqueios, etc.)
              </p>
              {!hasPermission && (
                <Button variant="outline" size="sm" onClick={requestPermission} className="mt-2">
                  Permitir Notificacoes
                </Button>
              )}
            </div>
          </div>
          <Switch
            id="browser-notifications"
            checked={preferences.browserNotifications}
            onCheckedChange={setBrowserNotifications}
            disabled={!hasPermission && !preferences.browserNotifications}
          />
        </div>

        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-3 flex-1">
            <Volume2 className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="sound-notifications" className="text-base font-medium">
                Notificacoes Sonoras
              </Label>
              <p className="text-sm text-muted-foreground">
                Reproduzir um som quando novos alertas criticos aparecerem
              </p>
            </div>
          </div>
          <Switch
            id="sound-notifications"
            checked={preferences.soundNotifications}
            onCheckedChange={setSoundNotifications}
          />
        </div>

        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start space-x-3 flex-1">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="email-digest" className="text-base font-medium">
                Resumo Diario por Email
              </Label>
              <p className="text-sm text-muted-foreground">
                Receba um resumo diario de todos os alertas e itens pendentes por email
              </p>
            </div>
          </div>
          <Switch
            id="email-digest"
            checked={preferences.emailDigest}
            onCheckedChange={setEmailDigest}
          />
        </div>
      </CardContent>
    </Card>
  );
}
