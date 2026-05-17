import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminProductionGateway as supabase } from "@/services/admin/admin-production-gateway";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, Truck, Calendar, Package, Save, RefreshCw, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminDeadlinesSettings() {
  const queryClient = useQueryClient();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  // Buscar configurações do SSOT
  const { data: settings, isLoading } = useQuery({
    queryKey: ["ssot-deadlines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value, description")
        .in("key", [
          "production_days_min",
          "shipping_business_days",
          "sales_duration_days",
          "delivery_interval_days",
          "monthly_capacity",
        ]);

      if (error) throw error;

      const settingsMap: Record<string, { value: string; description: string | null }> = {};
      data.forEach(item => {
        settingsMap[item.key] = { value: item.value, description: item.description };
      });

      return settingsMap;
    },
  });

  // Mutation para atualizar configuração
  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("system_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);

      if (error) throw error;
      return { key, value };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ssot-deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["system-deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-cycles"] });
      toast.success(`${getSettingLabel(data.key)} atualizado!`, {
        description: "Os ciclos serão recalculados automaticamente.",
      });
      setEditedValues(prev => {
        const newValues = { ...prev };
        delete newValues[data.key];
        return newValues;
      });
    },
    onError: (error: Error, variables) => {
      toast.error(`Erro ao atualizar ${getSettingLabel(variables.key)}`, {
        description: error.message,
      });
    },
  });

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
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (key: string) => {
    const value = editedValues[key];
    const numValue = parseInt(value);

    if (isNaN(numValue) || numValue < 1) {
      toast.error("Valor inválido", {
        description: "Digite um número maior que zero",
      });
      return;
    }

    updateSetting.mutate({ key, value });
  };

  const hasChanges = (key: string) => {
    return editedValues[key] !== undefined && editedValues[key] !== settings?.[key]?.value;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Prazos & Capacidade (SSOT)</h2>
        <p className="text-muted-foreground">
          Configure os prazos oficiais do sistema. Alterações aqui atualizam automaticamente todos os ciclos.
        </p>
      </div>

      {/* Alert Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Single Source of Truth:</strong> Estes valores são a fonte única de verdade para todo o sistema.
          Ao alterar, os ciclos de produção serão recalculados automaticamente.
        </AlertDescription>
      </Alert>

      {/* Settings Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {settings && Object.entries(settings).map(([key, data]) => (
          <Card key={key}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {getSettingIcon(key)}
                <CardTitle className="text-lg">{getSettingLabel(key)}</CardTitle>
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
                      Valor Atual
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
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
                      <Save className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                  )}
                </div>
                {!hasChanges(key) && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Salvo
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Warning */}
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
