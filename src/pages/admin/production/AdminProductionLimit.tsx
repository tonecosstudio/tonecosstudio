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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

export default function AdminProductionLimit() {
  const [newLimit, setNewLimit] = useState("");

  const {
    limit,
    isLoading,
    isError,
    error,
    available,
    total,
    percentage,
    isClosed,
    salesOpen,
    closeSales,
    reopenSales,
    refetch,
    isClosing,
    isReopening,
  } = useProductionLimit();

  const {
    data: settings,
    isLoading: isSettingsLoading,
    isError: isSettingsError,
    error: settingsError,
    refetch: refetchSettings,
  } = useProductionGlobalLimitSetting();
  const updateLimit = useUpdateProductionGlobalLimitSetting();

  const handleUpdateLimit = () => {
    const value = Number(newLimit);
    if (!Number.isInteger(value) || value < 1 || value > 100000) {
      toast.error("Valor inválido", {
        description: "Digite um número inteiro entre 1 e 100000.",
      });
      return;
    }

    updateLimit.mutate(String(value), {
      onSuccess: () => {
        toast.success("Limite atualizado com sucesso");
        setNewLimit("");
      },
      onError: (mutationError: Error) => {
        toast.error("Erro ao atualizar limite", {
          description: mutationError.message,
        });
      },
    });
  };

  const monthName = limit
    ? new Date(limit.prod_year, limit.prod_month - 1).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })
    : null;

  const operationalStateReady = !isLoading && !isError && Boolean(limit);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Limite de Produção</h1>
          <p className="text-muted-foreground">Gerencie o limite global de produção mensal</p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex h-40 items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : isError || !limit ? (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Estado de produção indisponível
              </CardTitle>
              <CardDescription>
                O painel não conseguiu validar o limite e o status oficial das vendas. Enquanto isso,
                o sistema deve permanecer fechado para novas vendas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>}
              <Button variant="outline" onClick={() => void refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
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
                  <Progress value={Math.min(percentage, 100)} className="mt-2" />
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
                      O backend registrou o mês atual como fechado.
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
                    <span className="font-medium">{limit.prod_units_sold}</span>
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

                <Progress value={Math.min(percentage, 100)} className="h-3" />

                <div className="flex gap-2">
                  {salesOpen ? (
                    <Button
                      variant="destructive"
                      onClick={() => closeSales("manual")}
                      disabled={isClosing || !operationalStateReady}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Fechar Vendas
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      onClick={() => reopenSales()}
                      disabled={isReopening || !operationalStateReady}
                    >
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
                          O estado persistido do mês atual está fechado. Reabra somente após validar
                          capacidade e operação.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuração Global
            </CardTitle>
            <CardDescription>
              Defina a capacidade oficial aplicada na criação de novos meses e ciclos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSettingsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Carregando configuração oficial...
              </div>
            ) : isSettingsError ? (
              <div className="space-y-3 rounded-lg border border-destructive/30 p-4">
                <p className="font-medium text-destructive">Configuração indisponível</p>
                <p className="text-sm text-muted-foreground">{getErrorMessage(settingsError)}</p>
                <Button variant="outline" size="sm" onClick={() => void refetchSettings()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Limite Atual</Label>
                  <div className="flex items-center gap-2">
                    <Input value={settings?.value ?? ""} disabled className="max-w-xs" />
                    <Badge variant={settings ? "secondary" : "destructive"}>
                      {settings ? "Configurado" : "Não configurado"}
                    </Badge>
                  </div>
                  {settings?.description && (
                    <p className="text-xs text-muted-foreground">{settings.description}</p>
                  )}
                  {!settings && (
                    <p className="text-xs text-destructive">
                      Sem limite oficial, novas vendas e a criação automática de ciclos devem permanecer bloqueadas.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-limit">{settings ? "Novo Limite" : "Definir Limite"}</Label>
                  <div className="flex max-w-md gap-2">
                    <Input
                      id="new-limit"
                      type="number"
                      min="1"
                      max="100000"
                      step="1"
                      placeholder="Ex: 100"
                      value={newLimit}
                      onChange={(event) => setNewLimit(event.target.value)}
                    />
                    <Button onClick={handleUpdateLimit} disabled={!newLimit || updateLimit.isPending}>
                      {updateLimit.isPending ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Salvar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Alterações afetam novos meses e ciclos. O limite persistido do mês atual não é
                    reescrito automaticamente.
                  </p>
                </div>
              </>
            )}

            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Contrato operacional</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
                    <li>O limite é global para a produção mensal.</li>
                    <li>O mês atual mantém o limite persistido quando já existe.</li>
                    <li>Vendas fecham automaticamente ao atingir o limite persistido.</li>
                    <li>Ausência ou invalidade da configuração não abre vendas por fallback.</li>
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
