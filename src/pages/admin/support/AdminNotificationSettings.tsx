import { useNavigate } from "react-router-dom";
import { Bell, History, Loader2, Mail, Smartphone, Volume2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminNotificationSettings,
  useSendAdminNotificationTest,
  useUpdateAdminNotificationSettings,
  type AdminNotificationSettings,
} from "@/hooks/admin/useAdminNotificationManagement";

export default function AdminNotificationSettings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: settings, isLoading } = useAdminNotificationSettings();
  const updateSettingsMutation = useUpdateAdminNotificationSettings();
  const testNotificationMutation = useSendAdminNotificationTest();

  const update = (updates: Partial<AdminNotificationSettings>) => {
    updateSettingsMutation.mutate(updates, {
      onSuccess: () => {
        toast({
          title: "Configurações salvas",
          description: "Suas preferências de notificação foram atualizadas.",
        });
      },
      onError: () => {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar as configurações. Tente novamente.",
          variant: "destructive",
        });
      },
    });
  };

  const sendTestNotification = () => {
    testNotificationMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Notificação de teste enviada",
          description: "Verifique o ícone de notificações no header.",
        });
      },
      onError: () => {
        toast({
          title: "Erro ao enviar teste",
          description: "Não foi possível enviar a notificação de teste.",
          variant: "destructive",
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configurações de Notificações</h2>
          <p className="text-muted-foreground">
            Gerencie como você recebe notificações do sistema
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/comunicacao?tab=history")}>
          <History className="mr-2 h-4 w-4" />
          Ver Histórico
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Tipos de Notificação
          </CardTitle>
          <CardDescription>Escolha quais tipos de notificação você deseja receber</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationToggle
            id="new_quote"
            label="Novos Orçamentos"
            description="Quando um novo orçamento é solicitado"
            checked={settings?.new_quote_enabled ?? true}
            onChange={(checked) => update({ new_quote_enabled: checked })}
          />
          <NotificationToggle
            id="payment_received"
            label="Pagamentos Recebidos"
            description="Quando um pagamento é confirmado"
            checked={settings?.payment_received_enabled ?? true}
            onChange={(checked) => update({ payment_received_enabled: checked })}
          />
          <NotificationToggle
            id="support_ticket"
            label="Tickets de Suporte"
            description="Quando um novo ticket é aberto"
            checked={settings?.support_ticket_enabled ?? true}
            onChange={(checked) => update({ support_ticket_enabled: checked })}
          />
          <NotificationToggle
            id="subscription_canceled"
            label="Assinaturas Canceladas"
            description="Quando uma assinatura é cancelada"
            checked={settings?.subscription_canceled_enabled ?? true}
            onChange={(checked) => update({ subscription_canceled_enabled: checked })}
          />
          <NotificationToggle
            id="low_stock"
            label="Estoque Baixo"
            description="Quando o estoque está baixo"
            checked={settings?.low_stock_enabled ?? true}
            onChange={(checked) => update({ low_stock_enabled: checked })}
          />
          <NotificationToggle
            id="system_error"
            label="Erros do Sistema"
            description="Quando ocorre um erro crítico"
            checked={settings?.system_error_enabled ?? true}
            onChange={(checked) => update({ system_error_enabled: checked })}
          />
          <NotificationToggle
            id="new_user"
            label="Novos Usuários"
            description="Quando um novo usuário se cadastra"
            checked={settings?.new_user_enabled ?? false}
            onChange={(checked) => update({ new_user_enabled: checked })}
          />
          <NotificationToggle
            id="preorder_completed"
            label="Pré-vendas Concluídas"
            description="Quando uma pré-venda é finalizada"
            checked={settings?.preorder_completed_enabled ?? true}
            onChange={(checked) => update({ preorder_completed_enabled: checked })}
          />
          <NotificationToggle
            id="production_ready"
            label="Produção Pronta"
            description="Quando um item está pronto para envio"
            checked={settings?.production_ready_enabled ?? true}
            onChange={(checked) => update({ production_ready_enabled: checked })}
          />
          <NotificationToggle
            id="message_received"
            label="Mensagens Recebidas"
            description="Quando você recebe uma nova mensagem"
            checked={settings?.message_received_enabled ?? true}
            onChange={(checked) => update({ message_received_enabled: checked })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Som
          </CardTitle>
          <CardDescription>Configure o som das notificações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationToggle
            id="sound_enabled"
            label="Habilitar Som"
            description="Tocar som quando receber notificações"
            checked={settings?.sound_enabled ?? true}
            onChange={(checked) => update({ sound_enabled: checked })}
          />
          {settings?.sound_enabled && (
            <div className="space-y-2">
              <Label htmlFor="sound_volume">Volume: {settings?.sound_volume ?? 50}%</Label>
              <Slider
                id="sound_volume"
                min={0}
                max={100}
                step={10}
                value={[settings?.sound_volume ?? 50]}
                onValueChange={([value]) => update({ sound_volume: value })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email
          </CardTitle>
          <CardDescription>Configure notificações por email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationToggle
            id="email_enabled"
            label="Habilitar Email"
            description="Receber notificações por email"
            checked={settings?.email_enabled ?? true}
            onChange={(checked) => update({ email_enabled: checked })}
          />
          {settings?.email_enabled && (
            <div className="space-y-2">
              <Label htmlFor="email_frequency">Frequência</Label>
              <Select
                value={settings?.email_frequency ?? "instant"}
                onValueChange={(value) => update({ email_frequency: value })}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>Notificações push do navegador (em breve)</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationToggle
            id="push_enabled"
            label="Habilitar Push"
            description="Receber notificações push do navegador"
            checked={settings?.push_enabled ?? false}
            onChange={(checked) => update({ push_enabled: checked })}
            disabled
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Testar Notificações</CardTitle>
          <CardDescription>
            Envie uma notificação de teste para verificar suas configurações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={sendTestNotification} disabled={testNotificationMutation.isPending}>
            {testNotificationMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Enviar Notificação de Teste
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

type NotificationToggleProps = {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

function NotificationToggle({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
