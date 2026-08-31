import { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  RefreshCw,
  Save,
  Timer,
  Truck,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useProductionDeadlinesSettings,
  useUpdateProductionDeadlineSetting,
} from "@/hooks/admin/useProductionDeadlinesSettings";
import type {
  ProductionDeadlineKey,
  ProductionDeadlineSettingValue,
} from "@/services/admin/production/production-deadlines-settings-service";

const SETTING_LABELS: Record<ProductionDeadlineKey, string> = {
  production_days_min: "Produção mínima",
  production_days_max: "Produção máxima",
  shipping_business_days: "Dia útil de início do envio",
  sales_duration_days: "Duração das vendas",
  delivery_interval_days: "Intervalo de entrega",
  character_choice_days: "Prazo para escolher personagem",
  balance_payment_days: "Prazo para pagamento do saldo",
};

const SETTING_ICONS: Record<ProductionDeadlineKey, typeof Clock> = {
  production_days_min: Clock,
  production_days_max: Timer,
  shipping_business_days: Truck,
  sales_duration_days: Calendar,
  delivery_interval_days: RefreshCw,
  character_choice_days: UserCheck,
  balance_payment_days: CreditCard,
};

const SETTING_MAX: Record<ProductionDeadlineKey, number> = {
  production_days_min: 3650,
  production_days_max: 3650,
  shipping_business_days: 31,
  sales_duration_days: 3650,
  delivery_interval_days: 3650,
  character_choice_days: 365,
  balance_payment_days: 365,
};

export default function AdminDeadlinesSettings() {
  const [editedValues, setEditedValues] = useState<
    Partial<Record<ProductionDeadlineKey, string>>
  >({});
  const { data: settings, isLoading, isError, error, refetch } =
    useProductionDeadlinesSettings();
  const updateSetting = useUpdateProductionDeadlineSetting();

  const handleChange = (key: ProductionDeadlineKey, value: string) => {
    setEditedValues((previous) => ({ ...previous, [key]: value }));
  };

  const currentValue = (key: ProductionDeadlineKey): number =>
    Number(editedValues[key] ?? settings?.[key]?.value);

  const handleSave = (key: ProductionDeadlineKey) => {
    const numericValue = currentValue(key);
    const max = SETTING_MAX[key];

    if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > max) {
      toast.error("Valor inválido", {
        description: `Digite um número inteiro entre 1 e ${max}.`,
      });
      return;
    }

    if (
      key === "production_days_min" &&
      Number.isFinite(currentValue("production_days_max")) &&
      numericValue > currentValue("production_days_max")
    ) {
      toast.error("Faixa de produção inválida", {
        description: "A produção mínima não pode superar a máxima.",
      });
      return;
    }

    if (
      key === "production_days_max" &&
      Number.isFinite(currentValue("production_days_min")) &&
      numericValue < currentValue("production_days_min")
    ) {
      toast.error("Faixa de produção inválida", {
        description: "A produção máxima não pode ser menor que a mínima.",
      });
      return;
    }

    updateSetting.mutate(
      { key, value: String(numericValue) },
      {
        onSuccess: (result) => {
          toast.success(`${SETTING_LABELS[result.key]} atualizado!`, {
            description:
              "A configuração oficial foi salva e as consultas dependentes serão recarregadas.",
          });
          setEditedValues((previous) => {
            const next = { ...previous };
            delete next[result.key];
            return next;
          });
        },
        onError: (mutationError: Error, variables) => {
          toast.error(`Erro ao atualizar ${SETTING_LABELS[variables.key]}`, {
            description: mutationError.message,
          });
        },
      },
    );
  };

  const hasChanges = (key: ProductionDeadlineKey) =>
    editedValues[key] !== undefined && editedValues[key] !== settings?.[key]?.value;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Prazos operacionais indisponíveis</CardTitle>
          <CardDescription>
            Não foi possível carregar a configuração oficial. Nenhum valor local será usado como
            substituto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error instanceof Error && (
            <p className="text-sm text-muted-foreground">{error.message}</p>
          )}
          <Button variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const entries = Object.entries(settings ?? {}) as Array<
    [ProductionDeadlineKey, ProductionDeadlineSettingValue]
  >;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Prazos Operacionais (SSOT)</h2>
        <p className="text-muted-foreground">
          Estes sete valores em <code>system_settings</code> são a fonte canônica usada por
          produção, escolha de personagem, envio e cobrança de saldo.
        </p>
      </div>

      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          O prazo de escolha é aplicado quando um pedido entra em
          <code className="mx-1">awaiting_choice</code>. Se a configuração estiver ausente ou
          inválida, o backend bloqueia a abertura da janela em vez de assumir um número de dias.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        {entries.map(([key, data]) => {
          const Icon = SETTING_ICONS[key];
          return (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <CardTitle className="text-lg">{SETTING_LABELS[key]}</CardTitle>
                </div>
                {data.description && (
                  <CardDescription className="text-sm">{data.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label htmlFor={key} className="text-sm text-muted-foreground">
                        Valor atual
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <Input
                          id={key}
                          type="number"
                          min="1"
                          max={SETTING_MAX[key]}
                          step="1"
                          value={editedValues[key] !== undefined ? editedValues[key] : data.value}
                          onChange={(event) => handleChange(key, event.target.value)}
                          className="w-28"
                        />
                        <span className="text-sm text-muted-foreground">
                          {key === "shipping_business_days" ? "º dia útil" : "dias"}
                        </span>
                      </div>
                    </div>
                    {hasChanges(key) && (
                      <Button
                        size="sm"
                        onClick={() => handleSave(key)}
                        disabled={updateSetting.isPending}
                        className="mt-6"
                      >
                        <Save className="mr-1 h-4 w-4" />
                        Salvar
                      </Button>
                    )}
                  </div>
                  {!hasChanges(key) && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Salvo
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Atenção:</strong> alterar uma configuração não reescreve silenciosamente prazos
          já persistidos em pedidos existentes. Esse comportamento deve ser tratado por uma operação
          explícita e auditável se for necessário no futuro.
        </AlertDescription>
      </Alert>
    </div>
  );
}
