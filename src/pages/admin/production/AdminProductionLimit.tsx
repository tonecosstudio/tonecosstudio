import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Settings,
  TrendingUp,
  Package,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Save,
} from "lucide-react";
import { useProductionLimit } from "@/hooks/useProductionLimit";

export default function AdminProductionLimit() {
  const queryClient = useQueryClient();
  const [newLimit, setNewLimit] = useState<string>("");

  const {
    limit,
    isLoading,
    available,
    total,
    percentage,
    isClosed,
    salesOpen,
    closeSales,
    reopenSales,
    isClosing,
    isReopening,
  } = useProductionLimit();

  // Query para buscar configuração atual
  const { data: settings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("key", "monthly_production_limit")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Retornar valor padrão se não existir configuração
        return { key: "monthly_production_limit", value: "100" };
      }

      return data;
    },
  });

  // Mutation para atualizar limite global
  const updateLimit = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase
        .from("system_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", "monthly_production_limit");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      queryClient.invalidateQueries({ queryKey: ["production-limit"] });
      toast.success("Limite atualizado com sucesso");
      setNewLimit("");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar limite", {
        description: error.message,
      });
    },
  });

  const handleUpdateLimit = () => {
    const value = parseInt(newLimit);
    if (isNaN(value) || value < 1) {
      toast.error("Valor inválido", {
        description: "Digite um número maior que zero",
      });
      return;
    }
    updateLimit.mutate(newLimit);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const monthName = limit
    ? new Date(limit.prod_year, limit.prod_month - 1).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Limite de Produção</h1>
          <p className="text-muted-foreground">Gerencie o limite global de produção mensal</p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vagas Disponíveis</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{available}</div>
              <p className="text-xs text-muted-foreground">de {total} vagas totais</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Ocupação</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{percentage.toFixed(0)}%</div>
              <Progress value={percentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status das Vendas</CardTitle>
              {salesOpen ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <Badge variant={salesOpen ? "default" : "destructive"}>
                {salesOpen ? "Abertas" : "Fechadas"}
              </Badge>
              {isClosed && (
                <p className="text-xs text-muted-foreground mt-2">
                  Motivo: {limit?.is_closed ? "Limite atingido" : "Manual"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Produção do Mês Atual */}
        <Card>
          <CardHeader>
            <CardTitle>Produção de {monthName}</CardTitle>
            <CardDescription>Controle de vendas e limite de produção do mês atual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vendas realizadas:</span>
                <span className="font-medium">{limit?.units_sold || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Limite global:</span>
                <span className="font-medium">{limit?.global_limit || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vagas restantes:</span>
                <span className="font-medium">{available}</span>
              </div>
            </div>

            <Progress value={percentage} className="h-3" />

            <div className="flex gap-2">
              {salesOpen ? (
                <Button
                  variant="destructive"
                  onClick={() => closeSales("manual")}
                  disabled={isClosing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Fechar Vendas
                </Button>
              ) : (
                <Button variant="default" onClick={() => reopenSales()} disabled={isReopening}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Reabrir Vendas
                </Button>
              )}
            </div>

            {isClosed && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Vendas Fechadas</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      As vendas foram encerradas. Clientes não poderão realizar novas compras até a
                      reabertura.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuração Global */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuração Global
            </CardTitle>
            <CardDescription>
              Defina o limite padrão de produção mensal (aplicado a novos meses)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Limite Atual</Label>
              <div className="flex items-center gap-2">
                <Input value={settings?.value || ""} disabled className="max-w-xs" />
                <Badge variant="secondary">Ativo</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{settings?.description}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-limit">Novo Limite</Label>
              <div className="flex gap-2 max-w-md">
                <Input
                  id="new-limit"
                  type="number"
                  min="1"
                  placeholder="Ex: 20"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                />
                <Button onClick={handleUpdateLimit} disabled={!newLimit || updateLimit.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Este valor será aplicado aos próximos meses. O mês atual mantém seu limite
                configurado.
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Como funciona</p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                    <li>O limite é global: soma de todas as coleções</li>
                    <li>Vendas fecham automaticamente ao atingir o limite</li>
                    <li>Vendas também fecham após 30 dias (mês completo de vendas)</li>
                    <li>Você pode fechar/reabrir manualmente a qualquer momento</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
