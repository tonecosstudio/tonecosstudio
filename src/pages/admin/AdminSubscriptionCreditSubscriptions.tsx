// @ts-nocheck
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminLayout } from "@/components/admin/AdminLayout";
import SEOHead from "@/components/SEOHead";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { subscriptionCreditAdminAPI } from "@/services/subscription-credit-admin-api";
import { CheckCircle2, XCircle, Clock, AlertCircle, CreditCard } from "lucide-react";

export default function AdminSubscriptionCreditSubscriptions() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [isAdjustingCredits, setIsAdjustingCredits] = useState(false);

  // Fetch subscriptions
  const subscriptionsQuery = useQuery({
    queryKey: ["admin-subscription-credit-subscriptions", statusFilter, planFilter, page],
    queryFn: () =>
      subscriptionCreditAdminAPI.getSubscriptions(
        page,
        20,
        statusFilter !== "all" ? statusFilter : undefined,
        planFilter !== "all" ? planFilter : undefined
      ),
  });

  const subscriptions = subscriptionsQuery.data?.subscriptions || [];
  const pagination = subscriptionsQuery.data?.pagination;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ativa
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Expirada
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelada
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPlanLabel = (planType: string) => {
    return planType === "trimestral" ? "Trimestral" : "Semestral";
  };

  return (
    <>
      <SEOHead
        title="Admin - Gerenciar Assinaturas"
        description="Gerenciar assinaturas do sistema de créditos"
        noindex={true}
      />

      <AdminLayout>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Assinaturas</h1>
          <p className="text-muted-foreground mt-2">
            Visualize e gerencie todas as assinaturas do sistema
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="active">Ativas</SelectItem>
                    <SelectItem value="expired">Expiradas</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label>Plano</Label>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions List */}
        <Card>
          <CardHeader>
            <CardTitle>Assinaturas</CardTitle>
            <CardDescription>
              {pagination ? `${pagination.total} assinatura(s) encontrada(s)` : "Carregando..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptionsQuery.isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Carregando assinaturas...</p>
              </div>
            )}

            {subscriptionsQuery.isError && (
              <div className="text-center py-8 text-destructive">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p>Erro ao carregar assinaturas</p>
              </div>
            )}

            {subscriptions.length === 0 && !subscriptionsQuery.isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma assinatura encontrada</p>
              </div>
            )}

            {subscriptions.length > 0 && (
              <div className="space-y-3">
                {subscriptions.map((subscription: any) => (
                  <div
                    key={subscription.id}
                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{subscription.user.email}</h4>
                          {getStatusBadge(subscription.status)}
                          <Badge variant="outline">{getPlanLabel(subscription.planType)}</Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Início:</span>
                            <p className="font-medium">
                              {format(new Date(subscription.startDate), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Término:</span>
                            <p className="font-medium">
                              {format(new Date(subscription.endDate), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Renovação:</span>
                            <p className="font-medium">
                              {subscription.autoRenew ? "Sim" : "Não"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Preço:</span>
                            <p className="font-medium text-green-600">
                              R$ {subscription.plan.price.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {subscription.pendingPlanChange && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-sm">
                            <span className="text-blue-600 dark:text-blue-400">
                              Mudança agendada para: {getPlanLabel(subscription.pendingPlanChange)}
                            </span>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSubscription(subscription);
                          setIsAdjustingCredits(true);
                        }}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Ajustar Créditos
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                >
                  Próxima
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Adjust Credits Dialog */}
        {isAdjustingCredits && selectedSubscription && (
          <AdjustCreditsDialog
            subscription={selectedSubscription}
            isOpen={isAdjustingCredits}
            onOpenChange={setIsAdjustingCredits}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ["admin-subscription-credit-subscriptions"] });
              setIsAdjustingCredits(false);
            }}
          />
        )}
      </AdminLayout>
    </>
  );
}

// Dialog: Adjust Credits
function AdjustCreditsDialog({ subscription, isOpen, onOpenChange, onSuccess }: any) {
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const adjustMutation = useMutation({
    mutationFn: async () => {
      const amountNum = parseInt(amount, 10);
      if (isNaN(amountNum) || amountNum === 0) {
        throw new Error("Valor inválido");
      }
      if (!reason.trim()) {
        throw new Error("Motivo é obrigatório");
      }
      await subscriptionCreditAdminAPI.adjustCredits(subscription.id, amountNum, reason);
    },
    onSuccess: () => {
      toast({
        title: "Créditos ajustados!",
        description: `${amount} créditos ${parseInt(amount) > 0 ? "adicionados" : "removidos"}`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao ajustar créditos",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar Créditos</DialogTitle>
          <DialogDescription>
            {subscription.user.email} - {subscription.planType}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-lg bg-muted space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plano:</span>
              <span className="font-medium">{subscription.plan.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Créditos Base:</span>
              <span className="font-medium">{subscription.plan.baseCredits}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Créditos Bônus:</span>
              <span className="font-medium">{subscription.plan.bonusCredits}</span>
            </div>
          </div>

          <div>
            <Label>Valor do Ajuste</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex: 100 (positivo) ou -50 (negativo)"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use valores positivos para adicionar e negativos para remover
            </p>
          </div>

          <div>
            <Label>Motivo</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Compensação por erro no sistema"
              className="mt-2"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => adjustMutation.mutate()} disabled={adjustMutation.isPending}>
            {adjustMutation.isPending ? "Ajustando..." : "Ajustar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
