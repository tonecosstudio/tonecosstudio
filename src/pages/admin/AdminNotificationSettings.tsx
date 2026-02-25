import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, Bell, Volume2, Mail, Smartphone, History } from "lucide-react";

export default function AdminNotificationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Buscar configurações
  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-notification-settings"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("admin_notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code === "PGRST116") {
        // Criar configurações padrão se não existir
        const { data: newSettings, error: insertError } = await supabase
          .from("admin_notification_settings")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        return newSettings;
      }

      if (error) throw error;
      return data;
    },
  });

  // Mutation para atualizar configurações
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<typeof settings>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("admin_notification_settings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notification-settings"] });
      toast({
        title: "Configurações salvas",
        description: "Suas preferências de notificação foram atualizadas.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Testar notificação
  const testNotificationMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("create_admin_notification", {
        p_type: "system_error",
        p_title: "Notificação de Teste",
        p_message: "Esta é uma notificação de teste para verificar suas configurações.",
        p_priority: "medium",
        p_icon: "Bell",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Notificação de teste enviada",
        description: "Verifique o ícone de notificações no header.",
      });
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configurações de Notificações</h1>
            <p className="text-muted-foreground">
              Gerencie como você recebe notificações do sistema
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin/notificacoes/historico")}>
            <History className="h-4 w-4 mr-2" />
            Ver Histórico
          </Button>
        </div>

        {/* Tipos de Notificação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Tipos de Notificação
            </CardTitle>
            <CardDescription>
              Escolha quais tipos de notificação você deseja receber
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="new_quote">Novos Orçamentos</Label>
                <p className="text-sm text-muted-foreground">
                  Quando um novo orçamento é solicitado
                </p>
              </div>
              <Switch
                id="new_quote"
                checked={settings?.new_quote_enabled ?? true}
                onCheckedChange={(checked) =>
                  updateSettingsMutation.mutate({ new_quote_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="payment_received">Pagamentos Recebidos</Label>
                <p className="text-sm text-muted-foreground">Quando um pagamento é confirmado</p>
              </div>
              <Switch
                id="payment_received"
                checked={settings?.payment_received_enabled ?? true}
                onCheckedChange={(checked) =>
                  updateSettingsMutation.mutate({ payment_received_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="support_ticket">Tickets de Suporte</Label>
                <p className="text-sm text-muted-foreground">Quando um novo ticket é aberto</p>
              </div>
              <Switch
                id="support_ticket"
                checked={settings?.support_ticket_enabled ?? true}
                onCheckedChange={(checked) =>
                  updateSettingsMutation.mutate({ support_ticket_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="subscription_canceled">Assinaturas Canceladas</Label>
                <p className="text-sm text-muted-foreground">Quando uma assinatura é cancelada</p>
              </div>
              <Switch
                id="subscription_canceled"
                checked={settings?.subscription_canceled_enabled ?? true}
                onCheckedChange={(checked) =>
                  updateSettingsMutation.mutate({ subscription_canceled_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="low_stock">Estoque Baixo</Label>
                <p className="text-sm text-muted-foreground">Quando o estoque está baixo</p>
              </div>
              <Switch
                id="low_stock"
                checked={settings?.low_stock_enabled ?? true}
                onCheckedChange={(checked) =>
                  updateSettingsMutation.mutate({ low_stock_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="system_error">Erros do Sistema</Label>
                <p className="text-sm text-muted-foreground">Quando ocorre um erro crítico</p>
              </div>
              <Switch
                id="system_error"
                checked={settings?.system_error_enabled ?? true}
                onCheckedChange={(checked) =>
                  updateSettingsMutation.mutate({ system_error_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="new_user">Novos Usuários</Label>
                <p className="text-sm text-muted-foreground">Quando um novo usuário se cadastra</p>
              </div>
              <Switch
                id="new_user"
                checked={settings?.new_user_enabled ?? false}
                onCheckedChange={(checked) =>
                  updateSettingsMutation.mutate({ new_user_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="preorder_completed">Pré-vendas Concluídas</Label>
                <p className="text-sm text-muted-foreground">Quando uma pré-venda é finalizada</p>
              </div>
              <Switch
                id="preorder_completed"
                checked={settings?.preorder_completed_enabled ?? true}
                onCheckedChange={(checked) =>
                  updateSettingsMutation.mutate({ preorder_completed_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="production_ready">Produção Pronta</Label>
                <p className="text-sm text-muted-foreground">
                  Quando um item está pronto para envio
                </p>
              </div>
              <Switch
                id="production_ready"
                checked={settings?.production_ready_enabled ?? true}
                onCheckedChange={(checked) =>
                  updateSettingsMutation.mutate({ production_ready_enabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="message_received">Mensagens Recebidas</Label>
                <p className="text-sm text-muted-foreground">
                  Quando você recebe uma nova mensagem
                </p>
              </div>
              <Switch
                id="message_received"
                checked={settings?.message_received_enabled ?? true}
                onCheckedChange={(checked) =>
                  updateSettingsMutation.mutate({ message_received_enabled: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Som */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Som
            </CardTitle>
            <CardDescription>Configure o som das notificações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound_enabled">Habilitar Som</Label>
                <p className="text-sm text-muted-foreground">
                  Tocar som quando receber notificações
                </p>
              </div>
              <Switch
                id="sound_enabled"
                checked={settings?.sound_enabled ?? true}
                onCheckedChange={(checked) =>
                  updateSettingsMutation.mutate({ sound_enabled: checked })
                }
              />
            </div>

            {settings?.sound_enabled && (
              <div className="space-y-2">
                <Label htmlFor="sound_volume">Volume: {settings?.sound_volume ?? 50}%</Label>
                <Slider
                  id="sound_volume"
                  min={0}
                  max={100}
                  step={10}
                  value={[settings?.sound_volume ?? 50]}
                  onValueChange={([value]) =>
                    updateSettingsMutation.mutate({ sound_volume: value })
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configurações de Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email
            </CardTitle>
            <CardDescription>Configure notificações por email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email_enabled">Habilitar Email</Label>
                <p className="text-sm text-muted-foreground">Receber notificações por email</p>
              </div>
              <Switch
                id="email_enabled"
                checked={settings?.email_enabled ?? true}
                onCheckedChange={(checked) =>
                  updateSettingsMutation.mutate({ email_enabled: checked })
                }
              />
            </div>

            {settings?.email_enabled && (
              <div className="space-y-2">
                <Label htmlFor="email_frequency">Frequência</Label>
                <Select
                  value={settings?.email_frequency ?? "instant"}
                  onValueChange={(value) =>
                    updateSettingsMutation.mutate({ email_frequency: value })
                  }
                >
                  <SelectTrigger id="email_frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instantâneo</SelectItem>
                    <SelectItem value="hourly">A cada hora</SelectItem>
                    <SelectItem value="daily">Diariamente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notificações Push (Futuro) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>Notificações push do navegador (em breve)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push_enabled">Habilitar Push</Label>
                <p className="text-sm text-muted-foreground">
                  Receber notificações push do navegador
                </p>
              </div>
              <Switch
                id="push_enabled"
                checked={settings?.push_enabled ?? false}
                onCheckedChange={(checked) =>
                  updateSettingsMutation.mutate({ push_enabled: checked })
                }
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Testar Notificação */}
        <Card>
          <CardHeader>
            <CardTitle>Testar Notificações</CardTitle>
            <CardDescription>
              Envie uma notificação de teste para verificar suas configurações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => testNotificationMutation.mutate()}
              disabled={testNotificationMutation.isPending}
            >
              {testNotificationMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enviar Notificação de Teste
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
