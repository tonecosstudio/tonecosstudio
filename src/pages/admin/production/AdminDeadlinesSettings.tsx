import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Clock,
  Truck,
  Calendar,
  Package,
  Save,
  RefreshCw,
  Info,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useProductionDeadlinesSettings,
  useUpdateProductionDeadlineSetting,
} from "@/hooks/admin/useProductionDeadlinesSettings";

export default function AdminDeadlinesSettings() {
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const { data: settings, isLoading } = useProductionDeadlinesSettings();
  const updateSetting = useUpdateProductionDeadlineSetting();

  const getSettingLabel = (key: string) => {
    const labels = {
      production_days_min: "Dias de Produção",
      shipping_business_days: "Dias Úteis de Envio",
      sales_duration_days: "Duração das Vendas",
      delivery_interval_days: "Intervalo Total",
      monthly_capacity: "Capacidade Mensal",
    };
    return labels[key as keyof typeof labels] || key;
  };

  const getSettingIcon = (key: string) => {
    const icons = {
      production_days_min: Clock,
      shipping_business_days: Truck,
      sales_duration_days: Calendar,
      delivery_interval_days: RefreshCw,
      monthly_capacity: Package,
    };
    const Icon = icons[key as keyof typeof icons] || Info;
    return <Icon className="h-5 w-5" />;
  };

  const handleChange = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (key: string) => {
    const value = editedValues[key];
    const numValue = parseInt(value, 10);

    if (isNaN(numValue) || numValue < 1) {
      toast.error("Valor inválido", {
        description: "Digite um número maior que zero",
      });
      return;
    }

    updateSetting.mutate(
      { key, value },
      {
        onSuccess: (result) => {
          toast.success(`${getSettingLabel(result.key)} atualizado!`, {
            description: "Os ciclos serão recalculados automaticamente.",
          });
          setEditedValues((prev) => {
            const newValues = { ...prev };
            delete newValues[result.key];
            return newValues;
          });
        },
        onError: (error: Error, variables) => {
          toast.error(`Erro ao atualizar ${getSettingLabel(variables.key)}`, {
            description: error.message,
          });
        },
      }
    );
  };

  const hasChanges = (key: string) =>
    editedValues[key] !== undefined && editedValues[key] !== settings?.[key]?.value;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Prazos & Capacidade (SSOT)</h2>
        <p className="text-muted-foreground">
          Configure os prazos oficiais do sistema. Alterações aqui atualizam automaticamente todos os ciclos.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Single Source of Truth:</strong> Estes valores são a fonte única de verdade para todo o
          sistema. Ao alterar, os ciclos de produção serão recalculados automaticamente.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        {settings &&
          Object.entries(settings).map(([key, data]) => (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {getSettingIcon(key)}
                  <CardTitle className="text-lg">{getSettingLabel(key)}</CardTitle>
                </div>
                {data.description && <CardDescription className="text-sm">{data.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label htmlFor={key} className="text-sm text-muted-foreground">
                        Valor Atual
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <Input
                          id={key}
                          type="number"
                          min="1"
                          value={editedValues[key] !== undefined ? editedValues[key] : data.value}
                          onChange={(e) => handleChange(key, e.target.value)}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">
                          {key === "monthly_capacity" ? "unidades" : "dias"}
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
          ))}
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Atenção:</strong> Alterar estes valores afeta todo o sistema de produção e envio.
          Certifique-se de que os novos valores estão corretos antes de salvar.
        </AlertDescription>
      </Alert>
    </div>
  );
}
