// @ts-nocheck
/**
 * Notification Preferences Component
 * 
 * Allows users to manage their email notification preferences.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { notificationPreferencesService, NotificationPreferences } from '@/services/notification-preferences-service';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, Bell, BellOff } from 'lucide-react';

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar logado para ver suas preferências',
          variant: 'destructive'
        });
        return;
      }

      const prefs = await notificationPreferencesService.getPreferences(user.id);
      
      if (!prefs) {
        // Create default preferences
        const newPrefs = await notificationPreferencesService.createDefaultPreferences(user.id);
        setPreferences(newPrefs);
      } else {
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar suas preferências',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (field: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;

    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updated = await notificationPreferencesService.updatePreferences(user.id, {
        [field]: value
      });

      if (updated) {
        setPreferences(updated);
        toast({
          title: 'Preferências atualizadas',
          description: 'Suas preferências de notificação foram salvas'
        });
      }
    } catch (error) {
      console.error('Error updating preference:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar suas preferências',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const enableAll = async () => {
    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updated = await notificationPreferencesService.enableAllEmails(user.id);
      
      if (updated) {
        setPreferences(updated);
        toast({
          title: 'Todas as notificações ativadas',
          description: 'Você receberá todos os tipos de email'
        });
      }
    } catch (error) {
      console.error('Error enabling all:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível ativar todas as notificações',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const disableAll = async () => {
    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updated = await notificationPreferencesService.disableAllEmails(user.id);
      
      if (updated) {
        setPreferences(updated);
        toast({
          title: 'Todas as notificações desativadas',
          description: 'Você não receberá mais emails automáticos'
        });
      }
    } catch (error) {
      console.error('Error disabling all:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível desativar todas as notificações',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
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
            Não foi possível carregar suas preferências
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
          <CardTitle>Preferências de Notificação</CardTitle>
        </div>
        <CardDescription>
          Escolha quais emails você deseja receber
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={enableAll}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Ativar Todas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={disableAll}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <BellOff className="h-4 w-4" />
            Desativar Todas
          </Button>
        </div>

        {/* Individual preferences */}
        <div className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="welcome_emails" className="flex flex-col space-y-1">
              <span className="font-medium">Emails de Boas-vindas</span>
              <span className="text-sm text-muted-foreground">
                Receba confirmação quando assinar o serviço
              </span>
            </Label>
            <Switch
              id="welcome_emails"
              checked={preferences.welcome_emails}
              onCheckedChange={(checked) => updatePreference('welcome_emails', checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="reminder_emails" className="flex flex-col space-y-1">
              <span className="font-medium">Lembretes de Escolha</span>
              <span className="text-sm text-muted-foreground">
                Receba lembretes para escolher sua coleção todo mês
              </span>
            </Label>
            <Switch
              id="reminder_emails"
              checked={preferences.reminder_emails}
              onCheckedChange={(checked) => updatePreference('reminder_emails', checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="revelation_emails" className="flex flex-col space-y-1">
              <span className="font-medium">Revelação de Personagens</span>
              <span className="text-sm text-muted-foreground">
                Receba notificação quando o personagem for revelado
              </span>
            </Label>
            <Switch
              id="revelation_emails"
              checked={preferences.revelation_emails}
              onCheckedChange={(checked) => updatePreference('revelation_emails', checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="shipping_emails" className="flex flex-col space-y-1">
              <span className="font-medium">Notificações de Envio</span>
              <span className="text-sm text-muted-foreground">
                Receba atualizações sobre produção e rastreamento
              </span>
            </Label>
            <Switch
              id="shipping_emails"
              checked={preferences.shipping_emails}
              onCheckedChange={(checked) => updatePreference('shipping_emails', checked)}
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
              onCheckedChange={(checked) => updatePreference('payment_emails', checked)}
              disabled={saving}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Nota: Emails importantes relacionados a segurança e transações sempre serão enviados,
          independente dessas configurações.
        </p>
      </CardContent>
    </Card>
  );
}
