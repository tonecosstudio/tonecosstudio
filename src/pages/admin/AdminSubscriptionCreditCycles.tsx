import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminLayout } from "@/components/admin/AdminLayout";
import SEOHead from "@/components/SEOHead";
import { subscriptionCreditAdminAPI } from "@/services/subscription-credit-admin-api";
import { subscriptionCreditAPI } from "@/services/subscription-credit-api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Package,
  CheckCircle2,
  AlertCircle,
  Lock,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function AdminSubscriptionCreditCycles() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [isViewingStats, setIsViewingStats] = useState(false);

  // Fetch current cycle
  const currentCycleQuery = useQuery({
    queryKey: ["admin-subscription-credit-current-cycle"],
    queryFn: () => subscriptionCreditAPI.getCurrentCycle(),
  });

  const currentCycle = currentCycleQuery.data;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge className="bg-green-500">
            <Package className="h-3 w-3 mr-1" />
            Aberto
          </Badge>
        );
      case "full":
        return (
          <Badge className="bg-orange-500">
            <AlertCircle className="h-3 w-3 mr-1" />
            Cheio
          </Badge>
        );
      case "closed":
        return (
          <Badge variant="secondary">
            <Lock className="h-3 w-3 mr-1" />
            Fechado
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <SEOHead
        title="Admin - Gerenciar Ciclos de Produção"
        description="Gerenciar ciclos de produção"
        noindex={true}
      />

      <AdminLayout>
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ciclos de Produção</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie ciclos de produção e capacidade
            </p>
          </div>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Ciclo
          </Button>
        </div>

        {/* Current Cycle */}
        {currentCycleQuery.isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Carregando ciclo atual...</p>
          </div>
        )}

        {currentCycleQuery.isError && (
          <div className="text-center py-12 text-destructive">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p>Erro ao carregar ciclo atual</p>
          </div>
        )}

        {!currentCycle && !currentCycleQuery.isLoading && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">Nenhum ciclo aberto no momento</p>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Ciclo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentCycle && (
          <div className="space-y-6">
            {/* Cycle Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{currentCycle.name}</CardTitle>
                    <CardDescription>Ciclo de produção atual</CardDescription>
                  </div>
                  {getStatusBadge(currentCycle.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Capacity Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Capacidade Utilizada</span>
                      <span className="text-sm text-muted-foreground">
                        {currentCycle.current_count} / {currentCycle.capacity_limit}
                      </span>
                    </div>
                    <Progress
                      value={(currentCycle.current_count / currentCycle.capacity_limit) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {((currentCycle.current_count / currentCycle.capacity_limit) * 100).toFixed(1)}%
                      utilizado
                    </p>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Data de Fechamento:</span>
                      <p className="font-bold">
                        {format(new Date(currentCycle.close_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Criado em:</span>
                      <p className="font-medium">
                        {format(new Date(currentCycle.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Vagas Restantes:</span>
                      <p className="font-bold text-green-600">
                        {currentCycle.capacity_limit - currentCycle.current_count}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <p className="font-medium">{currentCycle.status}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedCycle(currentCycle);
                        setIsViewingStats(true);
                      }}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Ver Estatísticas
                    </Button>
                    {currentCycle.status === "open" && (
                      <CloseCycleButton
                        cycle={currentCycle}
                        onSuccess={() => {
                          qc.invalidateQueries({
                            queryKey: ["admin-subscription-credit-current-cycle"],
                          });
                        }}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Capacidade Total</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentCycle.capacity_limit}</div>
                  <p className="text-xs text-muted-foreground">Personagens por ciclo</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Em Uso</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {currentCycle.current_count}
                  </div>
                  <p className="text-xs text-muted-foreground">Personagens alocados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Disponível</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {currentCycle.capacity_limit - currentCycle.current_count}
                  </div>
                  <p className="text-xs text-muted-foreground">Vagas restantes</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Create Cycle Dialog */}
        {isCreating && (
          <CreateCycleDialog
            isOpen={isCreating}
            onOpenChange={setIsCreating}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ["admin-subscription-credit-current-cycle"] });
              setIsCreating(false);
            }}
          />
        )}

        {/* Statistics Dialog */}
        {isViewingStats && selectedCycle && (
          <CycleStatisticsDialog
            cycle={selectedCycle}
            isOpen={isViewingStats}
            onOpenChange={setIsViewingStats}
          />
        )}
      </AdminLayout>
    </>
  );
}

// Component: Close Cycle Button
function CloseCycleButton({ cycle, onSuccess }: any) {
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);

  const closeMutation = useMutation({
    mutationFn: () => subscriptionCreditAdminAPI.closeProductionCycle(cycle.id),
    onSuccess: (result) => {
      toast({
        title: "Ciclo fechado!",
        description: `${result.confirmedOrders} pedidos confirmados, ${result.pendingOrders} pendentes`,
      });
      onSuccess();
      setIsConfirming(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao fechar ciclo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Button variant="destructive" onClick={() => setIsConfirming(true)}>
        <Lock className="h-4 w-4 mr-2" />
        Fechar Ciclo
      </Button>

      <Dialog open={isConfirming} onOpenChange={setIsConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Fechamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja fechar o ciclo "{cycle.name}"?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Atenção:</strong> Esta ação irá:
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1">
                <li>Bloquear todos os pedidos do ciclo</li>
                <li>Debitar créditos dos pedidos automáticos</li>
                <li>Processar pedidos com saldo suficiente</li>
                <li>Marcar pedidos com saldo insuficiente como pendentes</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-muted space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ciclo:</span>
                <span className="font-medium">{cycle.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Personagens:</span>
                <span className="font-medium">{cycle.currentCount}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsConfirming(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => closeMutation.mutate()}
              disabled={closeMutation.isPending}
            >
              {closeMutation.isPending ? "Fechando..." : "Confirmar Fechamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Dialog: Create Cycle
function CreateCycleDialog({ isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    capacityLimit: "",
    closeDate: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const data = {
        name: formData.name,
        capacityLimit: parseInt(formData.capacityLimit, 10),
        closeDate: new Date(formData.closeDate).toISOString(),
      };
      return subscriptionCreditAdminAPI.createProductionCycle(data);
    },
    onSuccess: () => {
      toast({
        title: "Ciclo criado!",
        description: "Novo ciclo de produção criado com sucesso",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar ciclo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Ciclo de Produção</DialogTitle>
          <DialogDescription>Crie um novo ciclo com capacidade limitada</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Nome do Ciclo *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Ciclo Janeiro 2024"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Capacidade Máxima *</Label>
            <Input
              type="number"
              value={formData.capacityLimit}
              onChange={(e) => setFormData({ ...formData, capacityLimit: e.target.value })}
              placeholder="Ex: 1000"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Número máximo de personagens neste ciclo
            </p>
          </div>

          <div>
            <Label>Data de Fechamento *</Label>
            <Input
              type="datetime-local"
              value={formData.closeDate}
              onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Data em que o ciclo será fechado automaticamente
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Criando..." : "Criar Ciclo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dialog: Cycle Statistics
function CycleStatisticsDialog({ cycle, isOpen, onOpenChange }: any) {
  const statsQuery = useQuery({
    queryKey: ["admin-subscription-credit-cycle-stats", cycle.id],
    queryFn: () => subscriptionCreditAdminAPI.getCycleStatistics(cycle.id),
    enabled: isOpen,
  });

  const stats = statsQuery.data?.statistics;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Estatísticas do Ciclo</DialogTitle>
          <DialogDescription>{cycle.name}</DialogDescription>
        </DialogHeader>

        {statsQuery.isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Carregando estatísticas...</p>
          </div>
        )}

        {statsQuery.isError && (
          <div className="text-center py-8 text-destructive">
            <p>Erro ao carregar estatísticas</p>
          </div>
        )}

        {stats && (
          <div className="space-y-6 py-4">
            {/* Orders Stats */}
            <div>
              <h3 className="font-semibold mb-3">Pedidos</h3>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{stats.totalOrders}</div>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{stats.confirmedOrders}</div>
                    <p className="text-xs text-muted-foreground">Confirmados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-orange-600">{stats.pendingOrders}</div>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Orders by Type */}
            <div>
              <h3 className="font-semibold mb-3">Por Tipo</h3>
              <div className="space-y-2">
                {stats.ordersByType.map((type: any) => (
                  <div key={type.type} className="flex justify-between p-3 rounded-lg bg-muted">
                    <span className="font-medium">
                      {type.type === "individual" ? "Individuais" : "Automáticos"}
                    </span>
                    <span className="font-bold">{type.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Capacity */}
            <div>
              <h3 className="font-semibold mb-3">Capacidade</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Utilizada:</span>
                  <span className="font-bold">{stats.capacityUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Limite:</span>
                  <span className="font-bold">{stats.capacityLimit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Percentual:</span>
                  <span className="font-bold">{stats.capacityPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={stats.capacityPercentage} className="h-2 mt-2" />
              </div>
            </div>

            {/* Credits */}
            <div>
              <h3 className="font-semibold mb-3">Créditos</h3>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-blue-600">
                    {stats.totalCredits.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">Total de créditos nos pedidos</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
