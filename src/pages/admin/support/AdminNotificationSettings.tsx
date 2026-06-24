import { useNavigate } from "react-router-dom";
import { Bell, History, Loader2, Mail, Smartphone, Volume2 } from "lucide-react";
import { ADMIN_ROUTES } from "@/config/routes";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminNotificationSettings,
  useSendAdminNotificationTest,
  useUpdateAdminNotificationSettings,
  type AdminNotificationSettings,
} from "@/hooks/admin/useAdminNotificationManagement";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function AdminNotificationSettings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: settings, isLoading } = useAdminNotificationSettings();
  const updateSettingsMutation = useUpdateAdminNotificationSettings();
  const testNotificationMutation = useSendAdminNotificationTest();
  const soundVolumePercent = Math.round((settings?.sound_volume ?? 0.5) * 100);

  const update = (updates: Partial<AdminNotificationSettings>) => {
    updateSettingsMutation.mutate(updates, {
      onSuccess: () => {
        toast({
          title: "Configuracoes salvas",
          description: "Suas preferencias de notificacao foram atualizadas.",
        });
      },
      onError: () => {
        toast({
          title: "Erro ao salvar",
          description: "Nao foi possivel salvar as configuracoes. Tente novamente.",
          variant: "destructive",
        });
      },
    });
  };

  const sendTestNotification = () => {
    testNotificationMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Notificacao de teste enviada",
          description: "Verifique o icone de notificacoes no cabecalho.",
        });
      },
      onError: () => {
        toast({
          title: "Erro ao enviar teste",
          description: "Nao foi possivel enviar a notificacao de teste.",
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
          <h2 className="text-2xl font-bold tracking-tight">Configuracoes de notificacoes</h2>
          <p className="text-muted-foreground">
            Defina como a equipe recebe alertas operacionais do sistema.
          </p>
        </div>

        <Button variant="outline" onClick={() => navigate(ADMIN_ROUTES.communicationHistory)}>
          <History className="mr-2 h-4 w-4" />
          Ver historico
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Tipos de notificacao
          </CardTitle>
          <CardDescription>Escolha quais eventos devem gerar alertas administrativos.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <NotificationToggle
            id="new_quote"
            label="Novos orcamentos"
            description="Quando um novo orcamento e solicitado."
            checked={settings?.new_quote_enabled ?? true}
            onChange={(checked) => update({ new_quote_enabled: checked })}
          />
          <NotificationToggle
            id="payment_received"
            label="Pagamentos recebidos"
            description="Quando um pagamento e confirmado."
            checked={settings?.payment_received_enabled ?? true}
            onChange={(checked) => update({ payment_received_enabled: checked })}
          />
          <NotificationToggle
            id="support_ticket"
            label="Tickets de suporte"
            description="Quando um novo ticket e aberto."
            checked={settings?.support_ticket_enabled ?? true}
            onChange={(checked) => update({ support_ticket_enabled: checked })}
          />
          <NotificationToggle
            id="subscription_canceled"
            label="Assinaturas canceladas"
            description="Quando uma assinatura e cancelada."
            checked={settings?.subscription_canceled_enabled ?? true}
            onChange={(checked) => update({ subscription_canceled_enabled: checked })}
          />
          <NotificationToggle
            id="low_stock"
            label="Estoque baixo"
            description="Quando o estoque entra em nivel de atencao."
            checked={settings?.low_stock_enabled ?? true}
            onChange={(checked) => update({ low_stock_enabled: checked })}
          />
          <NotificationToggle
            id="system_error"
            label="Erros do sistema"
            description="Quando ocorre um erro critico."
            checked={settings?.system_error_enabled ?? true}
            onChange={(checked) => update({ system_error_enabled: checked })}
          />
          <NotificationToggle
            id="new_user"
            label="Novos usuarios"
            description="Quando um novo usuario se cadastra."
            checked={settings?.new_user_enabled ?? false}
            onChange={(checked) => update({ new_user_enabled: checked })}
          />
          <NotificationToggle
            id="preorder_completed"
            label="Pre-vendas concluidas"
            description="Quando uma pre-venda e finalizada."
            checked={settings?.preorder_completed_enabled ?? true}
            onChange={(checked) => update({ preorder_completed_enabled: checked })}
          />
          <NotificationToggle
            id="production_ready"
            label="Producao pronta"
            description="Quando um item fica pronto para envio."
            checked={settings?.production_ready_enabled ?? true}
            onChange={(checked) => update({ production_ready_enabled: checked })}
          />
          <NotificationToggle
            id="message_received"
            label="Mensagens recebidas"
            description="Quando chega uma nova mensagem no atendimento."
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
          <CardDescription>Configure o alerta sonoro das notificacoes.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <NotificationToggle
            id="sound_enabled"
            label="Habilitar som"
            description="Tocar som quando chegar uma notificacao."
            checked={settings?.sound_enabled ?? true}
            onChange={(checked) => update({ sound_enabled: checked })}
          />

          {settings?.sound_enabled && (
            <div className="space-y-2">
              <Label htmlFor="sound_volume">Volume: {soundVolumePercent}%</Label>
              <Slider
                id="sound_volume"
                min={0}
                max={100}
                step={10}
                value={[soundVolumePercent]}
                onValueChange={([value]) => update({ sound_volume: value / 100 })}
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
          <CardDescription>Defina o ritmo de envio dos resumos por email.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <NotificationToggle
            id="email_enabled"
            label="Habilitar email"
            description="Receber notificacoes por email."
            checked={settings?.email_enabled ?? true}
            onChange={(checked) => update({ email_enabled: checked })}
          />

          {settings?.email_enabled && (
            <div className="space-y-2">
              <Label htmlFor="email_frequency">Frequencia</Label>
              <Select
                value={settings?.email_frequency ?? "instant"}
                onValueChange={(value) => update({ email_frequency: value })}
              >
                <SelectTrigger id="email_frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instantaneo</SelectItem>
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
            Push
          </CardTitle>
          <CardDescription>Notificacoes push do navegador ainda nao estao disponiveis.</CardDescription>
        </CardHeader>

        <CardContent>
          <NotificationToggle
            id="push_enabled"
            label="Habilitar push"
            description="Receber notificacoes push no navegador."
            checked={settings?.push_enabled ?? false}
            onChange={(checked) => update({ push_enabled: checked })}
            disabled
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teste de notificacao</CardTitle>
          <CardDescription>Envie um evento de teste para validar a configuracao atual.</CardDescription>
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
                Enviar notificacao de teste
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
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
