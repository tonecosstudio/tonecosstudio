import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  BookOpen,
  Coins,
  DollarSign,
  Info,
  Loader2,
  Package,
  RefreshCw,
  Settings,
  ShoppingCart,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditPricingForm } from "@/components/admin/payments/EditPricingForm";
import { ContextualPricingManager } from "@/components/admin/contextual-pricing";
import { EditStandalonePricingForm } from "@/components/admin/payments/EditStandalonePricingForm";
import { useAdminCoinsPricingConfig, useAdminCoinsStats } from "@/hooks/admin/useAdminCoinsSystem";
import type { AdminCoinsPricingConfig } from "@/services/admin/credits/admin-coins-system-service";

interface OfficialPricingReference {
  subscriptionBase: number;
  activeCollection: number;
  secondaryCollection: number;
  standardCatalog: number;
  premiumCatalog: number;
  chosenMultiplier: number;
  notChosenMultiplier: number;
  noSubscriptionMultiplier: number;
}

function readPositiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function readMultiplier(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0.1 && value <= 10
    ? value
    : null;
}

function buildOfficialPricingReference(
  config: AdminCoinsPricingConfig | undefined,
): OfficialPricingReference | null {
  if (!config) return null;

  const subscriptionBase = readPositiveInteger(
    config.basePrices.find((row) => row.collection_types?.name === "subscription")
      ?.base_price_coins,
  );
  const standardCatalog = readPositiveInteger(
    config.basePrices.find((row) =>
      ["standard_catalog", "standard"].includes(row.collection_types?.name ?? ""),
    )?.base_price_coins,
  );
  const premiumCatalog = readPositiveInteger(
    config.basePrices.find((row) =>
      ["premium_catalog", "premium"].includes(row.collection_types?.name ?? ""),
    )?.base_price_coins,
  );
  const chosenMultiplier = readMultiplier(
    config.multipliers.find((row) => row.user_context === "subscribed_chosen")?.multiplier,
  );
  const notChosenMultiplier = readMultiplier(
    config.multipliers.find((row) => row.user_context === "subscribed_not_chosen")?.multiplier,
  );
  const noSubscriptionMultiplier = readMultiplier(
    config.multipliers.find((row) => row.user_context === "no_subscription")?.multiplier,
  );

  if (
    subscriptionBase === null ||
    standardCatalog === null ||
    premiumCatalog === null ||
    chosenMultiplier === null ||
    notChosenMultiplier === null ||
    noSubscriptionMultiplier === null
  ) {
    return null;
  }

  const activeCollection = Math.round(subscriptionBase * chosenMultiplier);
  const secondaryCollection = Math.round(subscriptionBase * notChosenMultiplier);

  if (activeCollection < 1 || secondaryCollection < 1) return null;

  return {
    subscriptionBase,
    activeCollection,
    secondaryCollection,
    standardCatalog,
    premiumCatalog,
    chosenMultiplier,
    notChosenMultiplier,
    noSubscriptionMultiplier,
  };
}

function LoadingState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        {label}
      </CardContent>
    </Card>
  );
}

export default function AdminCoinsSystem() {
  const statsQuery = useAdminCoinsStats();
  const pricingConfigQuery = useAdminCoinsPricingConfig();
  const stats = statsQuery.data;
  const pricingConfig = pricingConfigQuery.data;
  const pricingReference = buildOfficialPricingReference(pricingConfig);

  const characterPrices = pricingReference
    ? [
        {
          type: "Coleção Ativa",
          coins: pricingReference.activeCollection,
          description: "Coleção escolhida pelo assinante",
          icon: <Star className="h-5 w-5 text-yellow-500" />,
          color: "bg-yellow-50 border-yellow-200",
          badge: "Assinante",
        },
        {
          type: "Coleção Secundária",
          coins: pricingReference.secondaryCollection,
          description: "Outra coleção disponível para assinantes",
          icon: <Package className="h-5 w-5 text-blue-500" />,
          color: "bg-blue-50 border-blue-200",
          badge: "Assinante",
        },
        {
          type: "Catálogo Geral",
          coins: pricingReference.standardCatalog,
          description: "Preço base oficial do catálogo padrão",
          icon: <ShoppingCart className="h-5 w-5 text-purple-500" />,
          color: "bg-purple-50 border-purple-200",
          badge: "Todos",
        },
        {
          type: "Premium",
          coins: pricingReference.premiumCatalog,
          description: "Preço base oficial do catálogo premium",
          icon: <Sparkles className="h-5 w-5 text-orange-500" />,
          color: "bg-orange-50 border-orange-200",
          badge: "Todos",
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <Coins className="h-8 w-8 text-yellow-500" />
          <h1 className="text-4xl font-bold tracking-tight">Sistema de Coins</h1>
        </div>
        <p className="text-muted-foreground">
          Gerenciamento do sistema de créditos internos da plataforma.
        </p>
      </div>

      {statsQuery.isPending ? (
        <LoadingState label="Carregando métricas de coins..." />
      ) : statsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Não foi possível carregar as métricas de coins. Nenhum valor zero está sendo usado
              como substituto para dados indisponíveis.
            </span>
            <Button variant="outline" size="sm" onClick={() => void statsQuery.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coins em Circulação</CardTitle>
              <Coins className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.totalBalance.toLocaleString("pt-BR")}
              </div>
              <p className="text-xs text-muted-foreground">Saldo total dos usuários</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Distribuído</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.totalEarned.toLocaleString("pt-BR")}
              </div>
              <p className="text-xs text-muted-foreground">Coins adicionados ao sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalSpent.toLocaleString("pt-BR")}
              </div>
              <p className="text-xs text-muted-foreground">Coins utilizados em compras</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários com Saldo</CardTitle>
              <Users className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Linhas de saldo carregadas</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
          <TabsTrigger value="overview">
            <Info className="mr-2 h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="rules">
            <BookOpen className="mr-2 h-4 w-4" />
            Regras e Preços
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="mr-2 h-4 w-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="contextual">
            <Tag className="mr-2 h-4 w-4" />
            Contextuais
          </TabsTrigger>
          <TabsTrigger value="standalone">
            <DollarSign className="mr-2 h-4 w-4" />
            Avulsos
          </TabsTrigger>
          <TabsTrigger value="packages">
            <Package className="mr-2 h-4 w-4" />
            Pacotes
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <TrendingUp className="mr-2 h-4 w-4" />
            Transações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>O que são Coins?</CardTitle>
              <CardDescription>Créditos internos da plataforma ORDAX</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Coins representam créditos internos para seleção e operações previstas no catálogo.
                Eles não são moeda, não são dinheiro e não devem ser apresentados como conversíveis
                em dinheiro sem uma regra comercial oficial específica.
              </p>
            </CardContent>
          </Card>

          {statsQuery.isPending ? (
            <LoadingState label="Carregando estatísticas..." />
          ) : statsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Estatísticas indisponíveis.</AlertDescription>
            </Alert>
          ) : stats ? (
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas do Sistema</CardTitle>
                <CardDescription>Dados retornados pelo ledger atual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Taxa de Utilização</p>
                    <p className="text-2xl font-bold">
                      {stats.totalEarned > 0
                        ? `${((stats.totalSpent / stats.totalEarned) * 100).toFixed(1)}%`
                        : "0%"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Média por Usuário</p>
                    <p className="text-2xl font-bold">
                      {stats.totalUsers > 0
                        ? Math.round(stats.totalBalance / stats.totalUsers).toLocaleString("pt-BR")
                        : 0}{" "}
                      coins
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total de Compras</p>
                    <p className="text-2xl font-bold">{stats.totalPurchases}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          {pricingConfigQuery.isPending ? (
            <LoadingState label="Carregando configuração oficial de preços..." />
          ) : pricingConfigQuery.isError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Não foi possível carregar o SSOT de preços em coins. Nenhuma referência foi
                  estimada.
                </span>
                <Button variant="outline" size="sm" onClick={() => void pricingConfigQuery.refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : !pricingReference ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                O SSOT de preços em coins está incompleto ou inválido. As referências comerciais
                foram ocultadas para evitar exibir números fabricados.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-amber-600" />
                    <CardTitle className="text-amber-900">
                      Base oficial da assinatura: {pricingReference.subscriptionBase} coins
                    </CardTitle>
                  </div>
                  <CardDescription className="text-amber-800">
                    Valores abaixo são derivados apenas das linhas ativas do SSOT.
                  </CardDescription>
                </CardHeader>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                {characterPrices.map((item) => (
                  <Card key={item.type} className={`border-2 ${item.color}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {item.icon}
                          <CardTitle className="text-lg">{item.type}</CardTitle>
                        </div>
                        <Badge variant="secondary" className="text-lg font-bold">
                          {item.coins} coins
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <Badge variant="outline" className="mt-3">
                        {item.badge}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Derivação oficial</CardTitle>
                  <CardDescription>Sem percentuais ou preços codificados no frontend</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contexto</TableHead>
                        <TableHead>Base</TableHead>
                        <TableHead>Multiplicador</TableHead>
                        <TableHead>Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Coleção escolhida</TableCell>
                        <TableCell>{pricingReference.subscriptionBase}</TableCell>
                        <TableCell>×{pricingReference.chosenMultiplier}</TableCell>
                        <TableCell className="font-bold">{pricingReference.activeCollection} coins</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Outra coleção</TableCell>
                        <TableCell>{pricingReference.subscriptionBase}</TableCell>
                        <TableCell>×{pricingReference.notChosenMultiplier}</TableCell>
                        <TableCell className="font-bold">{pricingReference.secondaryCollection} coins</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Sem assinatura</TableCell>
                        <TableCell>{pricingReference.subscriptionBase}</TableCell>
                        <TableCell>×{pricingReference.noSubscriptionMultiplier}</TableCell>
                        <TableCell className="text-muted-foreground">Regra contextual do backend</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-blue-900">Configuração de Preços — SSOT</CardTitle>
              </div>
              <CardDescription className="text-blue-800">
                O editor só é liberado quando preços base e multiplicadores canônicos já existem e
                são válidos. O frontend não cria valores comerciais substitutos.
              </CardDescription>
            </CardHeader>
          </Card>

          {pricingConfigQuery.isPending ? (
            <LoadingState label="Carregando configuração..." />
          ) : pricingConfigQuery.isError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Configuração de preços indisponível. Nenhuma edição foi habilitada.
              </AlertDescription>
            </Alert>
          ) : (
            <EditPricingForm
              basePrices={pricingConfig?.basePrices ?? []}
              multipliers={pricingConfig?.multipliers ?? []}
            />
          )}

          {pricingConfig && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Preços Base Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Coins</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricingConfig.basePrices.map((price) => (
                        <TableRow key={price.collection_types?.name ?? String(price.base_price_coins)}>
                          <TableCell>{price.collection_types?.name ?? "Tipo não resolvido"}</TableCell>
                          <TableCell className="font-bold">{price.base_price_coins}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Multiplicadores Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contexto</TableHead>
                        <TableHead>Multiplicador</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pricingConfig.multipliers.map((multiplier) => (
                        <TableRow key={multiplier.user_context}>
                          <TableCell>{multiplier.user_context}</TableCell>
                          <TableCell className="font-bold">×{multiplier.multiplier}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="contextual" className="space-y-6">
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-purple-900">Sistema de Preços Contextuais</CardTitle>
              </div>
              <CardDescription className="text-purple-800">
                Configure preços base, multiplicadores e regras contextuais no SSOT.
              </CardDescription>
            </CardHeader>
          </Card>
          <ContextualPricingManager />
        </TabsContent>

        <TabsContent value="standalone" className="space-y-6">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <CardTitle className="text-green-900">Preços Avulsos (R$)</CardTitle>
              </div>
              <CardDescription className="text-green-800">
                Preços oficiais para compras avulsas. Alterações devem permanecer no SSOT do
                backend.
              </CardDescription>
            </CardHeader>
          </Card>
          <EditStandalonePricingForm />
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          {statsQuery.isPending ? (
            <LoadingState label="Carregando pacotes..." />
          ) : statsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Pacotes de coins indisponíveis.</AlertDescription>
            </Alert>
          ) : stats ? (
            <Card>
              <CardHeader>
                <CardTitle>Pacotes de Coins Ativos</CardTitle>
                <CardDescription>Dados retornados da configuração atual</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.packages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum pacote ativo configurado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Coins</TableHead>
                        <TableHead>Bônus</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Preço</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.packages.map((pkg) => (
                        <TableRow key={pkg.id}>
                          <TableCell className="font-medium">{pkg.name}</TableCell>
                          <TableCell>{pkg.amount.toLocaleString("pt-BR")}</TableCell>
                          <TableCell>{pkg.bonus > 0 ? `+${pkg.bonus}` : "-"}</TableCell>
                          <TableCell className="font-bold">
                            {(pkg.amount + pkg.bonus).toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell>R$ {pkg.price_brl.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          {statsQuery.isPending ? (
            <LoadingState label="Carregando transações..." />
          ) : statsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Transações de coins indisponíveis.</AlertDescription>
            </Alert>
          ) : stats ? (
            <Card>
              <CardHeader>
                <CardTitle>Transações Recentes</CardTitle>
                <CardDescription>Últimas 10 transações retornadas pelo ledger</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma transação encontrada.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Descrição</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            {new Date(tx.created_at).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{tx.transaction_type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {tx.user_id.substring(0, 8)}...
                          </TableCell>
                          <TableCell
                            className={`font-bold ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {tx.amount > 0 ? "+" : ""}
                            {tx.amount.toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {tx.description || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
