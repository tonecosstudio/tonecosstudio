/**
 * Painel do Assinante - Sistema Híbrido
 * Versão atualizada com sistema de coins e escolha mensal
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Calendar,
  Coins,
  Package,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  ShoppingCart,
  Lock,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Link, useNavigate } from "react-router-dom";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useSubscriptionCoins,
  useMonthlySelections,
  canChangeSelection,
} from "@/hooks/useSubscriptionCoins";
import { ChangeActiveCollectionDialog } from "@/components/subscription/ChangeActiveCollectionDialog";
import AppShell from "@/components/AppShell";

export default function SubscriberDashboardHybrid() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showChangeCollectionDialog, setShowChangeCollectionDialog] = useState(false);

  // Buscar assinatura ativa
  const { data: activeSubscription } = useQuery({
    queryKey: ["active-subscription", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          `
          *,
          plan:plan_id (
            name,
            plan_type,
            description
          )
        `
        )
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;

      // Buscar coleção ativa separadamente
      if (data && (data as any).active_collection_id) {
        const { data: collection } = await supabase
          .from("collections")
          .select("id, name, slug, description")
          .eq("id", (data as any).active_collection_id)
          .single();

        return {
          ...data,
          active_collection: collection,
        } as any;
      }

      return data as any;
    },
  });

  const subscriptionId = (activeSubscription as any)?.id;

  // Queries do sistema híbrido
  const coinsQuery = useSubscriptionCoins(subscriptionId);
  const selectionsQuery = useMonthlySelections(subscriptionId);

  // Dados
  const coinsData = coinsQuery.data;
  const selections = selectionsQuery.data || [];

  // Calcular meses da assinatura
  const getSubscriptionMonths = () => {
    if (!activeSubscription) return [];

    const startDate = new Date(activeSubscription.created_at);
    const monthsCount =
      activeSubscription.plan_type === "trimestral"
        ? 3
        : activeSubscription.plan_type === "semestral"
          ? 6
          : 12;

    return Array.from({ length: monthsCount }, (_, i) => {
      const monthDate = addMonths(startDate, i);
      return format(monthDate, "yyyy-MM");
    });
  };

  const months = getSubscriptionMonths();

  // Sem assinatura
  if (!activeSubscription) {
    return (
      <AppShell>
        <SEOHead title="Meu Painel" noindex />
        <div className="container py-8 max-w-7xl">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma assinatura ativa</h3>
              <p className="text-muted-foreground text-center mb-6">
                Assine e receba coins para escolher seus personagens favoritos
              </p>
              <Button asChild>
                <Link to="/planos">Ver Planos</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SEOHead title="Meu Painel" noindex />

      <div className="container py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Meu Painel</h1>
          <p className="text-muted-foreground">
            Gerencie sua assinatura e escolha seus personagens
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card de Saldo */}
            <Card className="border-2 border-amber-500/20 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-amber-500" />
                    Seu Saldo de Coins
                  </CardTitle>
                  <Badge variant="secondary">{activeSubscription.plan?.plan_type}</Badge>
                </div>
                <CardDescription>
                  Use seus coins para escolher personagens mensalmente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Saldo Atual */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-amber-600">
                      {coinsData?.coins_balance || 0}
                    </span>
                    <span className="text-lg text-muted-foreground">
                      / {coinsData?.coins_initial || 0} coins
                    </span>
                  </div>

                  {/* Barra de Progresso */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Utilização</span>
                      <span className="font-medium">
                        {coinsData
                          ? Math.round(
                              ((coinsData.coins_initial - coinsData.coins_balance) /
                                coinsData.coins_initial) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-3 rounded-full transition-all"
                        style={{
                          width: `${coinsData ? ((coinsData.coins_initial - coinsData.coins_balance) / coinsData.coins_initial) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Estatísticas */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Gastos</div>
                      <div className="text-xl font-bold text-red-600">
                        {coinsData?.coins_spent || 0} coins
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Disponível</div>
                      <div className="text-xl font-bold text-green-600">
                        {coinsData?.coins_balance || 0} coins
                      </div>
                    </div>
                  </div>

                  {/* Alerta de Saldo Baixo */}
                  {coinsData && coinsData.coins_balance < 200 && (
                    <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-900 dark:text-amber-100">
                        <strong>Saldo baixo!</strong> Você pode não ter coins suficientes para os
                        próximos meses.
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto text-amber-600 ml-2"
                          onClick={() => {
                            // TODO: Implementar compra de coins
                          }}
                        >
                          Comprar coins extras
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card de Coleção Ativa */}
            {(activeSubscription as any)?.active_collection &&
              "name" in (activeSubscription as any).active_collection && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Sua Coleção Ativa
                    </CardTitle>
                    <CardDescription>
                      Personagens desta coleção custam 200 coins (preço prioritário)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-2">
                          {(activeSubscription.active_collection as any).name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {(activeSubscription.active_collection as any).description}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowChangeCollectionDialog(true)}
                          >
                            Trocar Coleção Ativa
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link
                              to={`/colecoes/${(activeSubscription.active_collection as any).slug}`}
                            >
                              Ver Personagens
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Escolhas Mensais */}
            <Card>
              <CardHeader>
                <CardTitle>Suas Escolhas Mensais</CardTitle>
                <CardDescription>
                  Escolha um personagem para cada mês da sua assinatura
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {months.map((month) => {
                    const selection = selections.find((s) => s.delivery_month === month);
                    const monthDate = new Date(month + "-01");
                    const { canChange, reason } = canChangeSelection(selection, month);

                    return (
                      <div
                        key={month}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          selection
                            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                            : canChange
                              ? "bg-muted border-border"
                              : "bg-muted/50 border-border opacity-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {format(monthDate, "MMMM yyyy", { locale: ptBR })}
                            </div>
                            {selection ? (
                              <div className="text-sm text-muted-foreground">
                                {selection.character_name} ({selection.coins_spent} coins)
                                {selection.is_auto_selected && " - Escolha automática"}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                {canChange ? "Aguardando escolha" : reason}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {selection ? (
                            <>
                              <Badge variant="secondary" className="bg-green-500 text-white">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Escolhido
                              </Badge>
                              {canChange ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/escolher-personagem/${month}`)}
                                >
                                  Trocar
                                </Button>
                              ) : (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="sm" variant="outline" disabled>
                                        <Lock className="h-4 w-4 mr-2" />
                                        Bloqueado
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="font-semibold">Não é possível trocar</p>
                                      <p className="text-xs">{reason}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </>
                          ) : canChange ? (
                            <Button
                              size="sm"
                              onClick={() => navigate(`/escolher-personagem/${month}`)}
                            >
                              Escolher
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          ) : (
                            <Badge variant="secondary">{reason}</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Card de Assinatura */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sua Assinatura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Plano</div>
                  <div className="font-semibold capitalize">{activeSubscription.plan?.name}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Status</div>
                  <Badge className="bg-green-500">Ativa</Badge>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Início</div>
                  <div className="text-sm">
                    {format(new Date(activeSubscription.created_at), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to="/minhas-assinaturas">Ver Detalhes</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Ações Rápidas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    // TODO: Implementar compra de coins
                  }}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Comprar Coins Extras
                </Button>

                <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                  <Link to="/meus-pagamentos">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Histórico de Pagamentos
                  </Link>
                </Button>

                <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                  <Link to="/minhas-assinaturas">
                    <Package className="h-4 w-4 mr-2" />
                    Gerenciar Assinatura
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Dica */}
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                <strong>💡 Dica:</strong> Escolha personagens da sua coleção ativa para economizar
                coins!
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>

      {/* Modal de Troca de Coleção Ativa */}
      {subscriptionId && (
        <ChangeActiveCollectionDialog
          subscriptionId={subscriptionId}
          currentCollectionId={(activeSubscription as any)?.active_collection_id || null}
          isOpen={showChangeCollectionDialog}
          onOpenChange={setShowChangeCollectionDialog}
        />
      )}
    </AppShell>
  );
}
