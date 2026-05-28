import { useState } from "react";
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
import {
  useProductionGlobalLimitSetting,
  useUpdateProductionGlobalLimitSetting,
} from "@/hooks/admin/useProductionGlobalLimitSetting";

export default function AdminProductionLimit() {
  const [newLimit, setNewLimit] = useState("");

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

  const { data: settings } = useProductionGlobalLimitSetting();
  const updateLimit = useUpdateProductionGlobalLimitSetting();

  const handleUpdateLimit = () => {
    const value = parseInt(newLimit, 10);
    if (isNaN(value) || value < 1) {
      toast.error("Valor inválido", {
        description: "Digite um número maior que zero",
      });
      return;
    }

    updateLimit.mutate(newLimit, {
      onSuccess: () => {
        toast.success("Limite atualizado com sucesso");
        setNewLimit("");
      },
      onError: (error: Error) => {
        toast.error("Erro ao atualizar limite", {
          description: error.message,
        });
      },
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
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
        <div>
          <h1 className="mb-2 text-3xl font-bold">Limite de Produção</h1>
          <p className="text-muted-foreground">Gerencie o limite global de produção mensal</p>
        </div>

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
                <p className="mt-2 text-xs text-muted-foreground">
                  Motivo: {isClosed ? "Limite atingido" : "Manual"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Produção de {monthName}</CardTitle>
            <CardDescription>Controle de vendas e limite de produção do mês atual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vendas realizadas:</span>
                <span className="font-medium">{limit?.prod_units_sold || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Limite global:</span>
                <span className="font-medium">{total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vagas restantes:</span>
                <span className="font-medium">{available}</span>
              </div>
            </div>

            <Progress value={percentage} className="h-3" />

            <div className="flex gap-2">
              {salesOpen ? (
                <Button variant="destructive" onClick={() => closeSales("manual")} disabled={isClosing}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Fechar Vendas
                </Button>
              ) : (
                <Button variant="default" onClick={() => reopenSales()} disabled={isReopening}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Reabrir Vendas
                </Button>
              )}
            </div>

            {isClosed && (
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Vendas Fechadas</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      As vendas foram encerradas. Clientes não poderão realizar novas compras até a
                      reabertura.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
              <div className="flex max-w-md gap-2">
                <Input
                  id="new-limit"
                  type="number"
                  min="1"
                  placeholder="Ex: 20"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                />
                <Button onClick={handleUpdateLimit} disabled={!newLimit || updateLimit.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Este valor será aplicado aos próximos meses. O mês atual mantém seu limite
                configurado.
              </p>
            </div>

            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Como funciona</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
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
