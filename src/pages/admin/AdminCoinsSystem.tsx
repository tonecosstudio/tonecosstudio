import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Coins,
  Package,
  TrendingUp,
  Users,
  DollarSign,
  Info,
  BookOpen,
  ShoppingCart,
  Star,
  Sparkles,
  Settings,
  Tag,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditPricingForm } from "@/components/admin/EditPricingForm";
import { ContextualPricingManager } from "@/components/admin/contextual-pricing";
import { EditStandalonePricingForm } from "@/components/admin/EditStandalonePricingForm";

export default function AdminCoinsSystem() {
  // Buscar estatísticas de coins
  const { data: stats } = useQuery({
    queryKey: ["admin-coins-stats"],
    queryFn: async () => {
      // Total de coins em circulação
      const { data: userCoins } = await supabase
        .from("user_coins")
        .select("balance, total_earned, total_spent");

      const totalBalance = userCoins?.reduce((acc, u) => acc + (u.balance || 0), 0) || 0;
      const totalEarned = userCoins?.reduce((acc, u) => acc + (u.total_earned || 0), 0) || 0;
      const totalSpent = userCoins?.reduce((acc, u) => acc + (u.total_spent || 0), 0) || 0;

      // Transações recentes
      const { data: transactions } = await supabase
        .from("coin_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      // Pacotes de coins
      const { data: packages } = await supabase
        .from("coin_packages")
        .select("*")
        .eq("is_active", true)
        .order("amount", { ascending: true });

      // Personagens adquiridos com coins
      const { data: purchases } = await supabase
        .from("user_characters")
        .select("*")
        .eq("acquisition_type", "coins");

      return {
        totalBalance,
        totalEarned,
        totalSpent,
        totalUsers: userCoins?.length || 0,
        transactions: transactions || [],
        packages: packages || [],
        totalPurchases: purchases?.length || 0,
      };
    },
  });

  // Buscar configurações de preços do banco (SSOT)
  const { data: pricingConfig } = useQuery({
    queryKey: ["admin-coins-pricing-config"],
    queryFn: async () => {
      // Buscar preços base gerais (catálogos)
      const { data: basePrices } = await supabase
        .from("collection_base_pricing")
        .select(`
          base_price_coins,
          collection_types (name)
        `)
        .eq("is_active", true);

      // Buscar multiplicadores
      const { data: multipliers } = await supabase
        .from("pricing_context_multipliers")
        .select("*")
        .eq("is_active", true);

      return { basePrices, multipliers };
    },
  });

  // Calcular preços reais baseado na configuração do banco
  const calculatePrices = () => {
    if (!pricingConfig?.multipliers || !pricingConfig?.basePrices) {
      return {
        colecaoAtiva: 200,
        colecaoSecundaria: 240,
        catalogoGeral: 300,
        premium: 450,
      };
    }

    // BASE DE REFERÊNCIA: 200 coins (Coleção Ativa)
    const baseReference = 200;

    // Buscar multiplicadores
    const chosenMultiplier =
      pricingConfig.multipliers.find((m) => m.user_context === "subscribed_chosen")
        ?.multiplier || 1.0;
    const notChosenMultiplier =
      pricingConfig.multipliers.find((m) => m.user_context === "subscribed_not_chosen")
        ?.multiplier || 1.2;

    // Buscar bases de catálogos (fixos)
    const standardBase =
      pricingConfig.basePrices.find((p) => p.collection_types?.name === "standard_catalog")
        ?.base_price_coins || 300;
    const premiumBase =
      pricingConfig.basePrices.find((p) => p.collection_types?.name === "premium_catalog")
        ?.base_price_coins || 450;

    return {
      colecaoAtiva: Math.round(baseReference * chosenMultiplier), // 200 × 1.0 = 200
      colecaoSecundaria: Math.round(baseReference * notChosenMultiplier), // 200 × 1.2 = 240
      catalogoGeral: standardBase, // 300 (fixo)
      premium: premiumBase, // 450 (fixo)
    };
  };

  const prices = calculatePrices();

  // Dados das regras do sistema (VALORES REAIS DO BANCO)
  const characterPrices = [
    {
      type: "Coleção Ativa",
      coins: prices.colecaoAtiva,
      description: "Coleção escolhida pelo assinante (Naruto, Dragon Ball, Marvel, etc.)",
      icon: <Star className="h-5 w-5 text-yellow-500" />,
      color: "bg-yellow-50 border-yellow-200",
      badge: "Assinante",
    },
    {
      type: "Coleção Secundária",
      coins: prices.colecaoSecundaria,
      description: "Personagens de outras coleções disponíveis",
      icon: <Package className="h-5 w-5 text-blue-500" />,
      color: "bg-blue-50 border-blue-200",
      badge: "Assinante",
    },
    {
      type: "Catálogo Geral",
      coins: prices.catalogoGeral,
      description: "Modelos especiais ou menos produzidos",
      icon: <ShoppingCart className="h-5 w-5 text-purple-500" />,
      color: "bg-purple-50 border-purple-200",
      badge: "Todos",
    },
    {
      type: "Premium",
      coins: prices.premium,
      description: "Peças maiores ou mais complexas",
      icon: <Sparkles className="h-5 w-5 text-orange-500" />,
      color: "bg-orange-50 border-orange-200",
      badge: "Todos",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
          <div className="flex items-center gap-3 mb-2">
            <Coins className="h-8 w-8 text-yellow-500" />
            <h1 className="text-4xl font-bold tracking-tight">Sistema de Coins</h1>
          </div>
          <p className="text-muted-foreground">
            Gerenciamento completo do sistema de créditos internos da plataforma
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coins em Circulação</CardTitle>
              <Coins className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.totalBalance.toLocaleString("pt-BR") || 0}
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
                {stats?.totalEarned.toLocaleString("pt-BR") || 0}
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
                {stats?.totalSpent.toLocaleString("pt-BR") || 0}
              </div>
              <p className="text-xs text-muted-foreground">Coins utilizados em compras</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <Users className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">Com saldo de coins</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">
              <Info className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="rules">
              <BookOpen className="h-4 w-4 mr-2" />
              Regras e Preços
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="contextual">
              <Tag className="h-4 w-4 mr-2" />
              Preços Contextuais
            </TabsTrigger>
            <TabsTrigger value="standalone">
              <DollarSign className="h-4 w-4 mr-2" />
              Preços Avulsos
            </TabsTrigger>
            <TabsTrigger value="packages">
              <Package className="h-4 w-4 mr-2" />
              Pacotes
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <TrendingUp className="h-4 w-4 mr-2" />
              Transações
            </TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>O que são Coins?</CardTitle>
                <CardDescription>Sistema de créditos internos da plataforma Ordax</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <p className="text-base">
                    Coins são créditos internos da plataforma Ordax que servem exclusivamente para:
                  </p>
                  <ul className="space-y-2 mt-4">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span>Selecionar personagens do catálogo</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span>Trocar personagens já selecionados</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span>Acessar personagens de outras coleções</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span>Acessar o catálogo premium</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900">Importante</p>
                      <p className="text-sm text-amber-800 mt-1">
                        Coins não são moeda, não são dinheiro e não podem ser convertidos em
                        dinheiro. Eles representam créditos de seleção dentro do catálogo de
                        colecionáveis sob encomenda.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estatísticas do Sistema</CardTitle>
                <CardDescription>Métricas em tempo real</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Taxa de Utilização</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold">
                        {stats?.totalEarned > 0
                          ? ((stats.totalSpent / stats.totalEarned) * 100).toFixed(1)
                          : 0}
                        %
                      </p>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{
                          width: `${stats?.totalEarned > 0 ? (stats.totalSpent / stats.totalEarned) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Média por Usuário</p>
                    <p className="text-2xl font-bold">
                      {stats?.totalUsers > 0
                        ? Math.round(stats.totalBalance / stats.totalUsers).toLocaleString("pt-BR")
                        : 0}{" "}
                      coins
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total de Compras</p>
                    <p className="text-2xl font-bold">{stats?.totalPurchases || 0}</p>
                    <p className="text-xs text-muted-foreground">Personagens adquiridos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Regras e Preços */}
          <TabsContent value="rules" className="space-y-6">
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-amber-900">
                    Base de Referência: Coleção Ativa = 200 coins
                  </CardTitle>
                </div>
                <CardDescription className="text-amber-800">
                  Os preços são calculados a partir da base de 200 coins (Coleção Ativa). Outros
                  tipos têm acréscimo sobre essa base.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Valor dos Personagens</CardTitle>
                <CardDescription>
                  Cada personagem possui um custo em coins baseado no tipo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {characterPrices.map((item) => (
                    <Card key={item.type} className={`border-2 ${item.color}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {item.icon}
                            <CardTitle className="text-lg">{item.type}</CardTitle>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="secondary" className="text-lg font-bold">
                              {item.coins} coins
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {item.badge}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Explicação Detalhada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Coleção Ativa
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Coleção escolhida pelo assinante no momento da assinatura.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <p className="text-sm font-medium">Exemplos:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Naruto</li>
                      <li>• Dragon Ball</li>
                      <li>• Marvel</li>
                      <li>• DC Comics</li>
                    </ul>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Personagens da coleção ativa são a BASE DE REFERÊNCIA ({prices.colecaoAtiva}{" "}
                    coins fixo). Todos os outros tipos têm acréscimo sobre essa base.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-500" />
                    Coleção Secundária
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Personagens de outras coleções disponíveis na plataforma. Custam{" "}
                    {prices.colecaoSecundaria} coins (+20% sobre a base de referência).
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-purple-500" />
                    Catálogo Geral
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Modelos especiais ou menos produzidos. Custam {prices.catalogoGeral} coins
                    (+50% sobre a base de referência).
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-orange-500" />
                    Premium
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Peças maiores ou mais complexas. Custam {prices.premium} coins (+125% sobre a
                    base de referência).
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuração (SSOT) */}
          <TabsContent value="config" className="space-y-6">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-blue-900">
                    Configuração de Preços (SSOT - Single Source of Truth)
                  </CardTitle>
                </div>
                <CardDescription className="text-blue-800">
                  BASE DE REFERÊNCIA: 200 coins (Coleção Ativa). Todos os outros tipos têm
                  acréscimo sobre essa base usando multiplicadores.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Formulário de Edição */}
            <EditPricingForm 
              basePrices={pricingConfig?.basePrices || []}
              multipliers={pricingConfig?.multipliers || []}
            />

            <Card>
              <CardHeader>
                <CardTitle>Base de Referência e Multiplicadores</CardTitle>
                <CardDescription>
                  Todos os preços são calculados a partir da base de 200 coins (Coleção Ativa)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-bold text-lg text-yellow-900">
                      Base de Referência: 200 coins
                    </h3>
                  </div>
                  <p className="text-sm text-yellow-800">
                    A Coleção Ativa é a referência do sistema. Todos os outros preços são
                    calculados aplicando multiplicadores sobre essa base.
                  </p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Base</TableHead>
                      <TableHead>Multiplicador</TableHead>
                      <TableHead>Cálculo</TableHead>
                      <TableHead>Preço Final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-yellow-50">
                      <TableCell className="font-medium">Coleção Ativa</TableCell>
                      <TableCell>200 coins</TableCell>
                      <TableCell>
                        <Badge variant="default">×1.0</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">200 × 1.0</TableCell>
                      <TableCell className="font-bold text-lg">200 coins</TableCell>
                    </TableRow>
                    <TableRow className="bg-blue-50">
                      <TableCell className="font-medium">Coleção Secundária</TableCell>
                      <TableCell>200 coins</TableCell>
                      <TableCell>
                        <Badge variant="secondary">×1.2</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">200 × 1.2</TableCell>
                      <TableCell className="font-bold text-lg">240 coins</TableCell>
                    </TableRow>
                    <TableRow className="bg-purple-50">
                      <TableCell className="font-medium">Catálogo Geral</TableCell>
                      <TableCell>200 coins</TableCell>
                      <TableCell>
                        <Badge variant="secondary">×1.5</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">200 × 1.5</TableCell>
                      <TableCell className="font-bold text-lg">300 coins</TableCell>
                    </TableRow>
                    <TableRow className="bg-orange-50">
                      <TableCell className="font-medium">Premium</TableCell>
                      <TableCell>200 coins</TableCell>
                      <TableCell>
                        <Badge variant="secondary">×2.25</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">200 × 2.25</TableCell>
                      <TableCell className="font-bold text-lg">450 coins</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preços Base de Catálogos (Fixos)</CardTitle>
                <CardDescription>
                  Valores fixos para catálogos (não dependem de contexto)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de Coleção</TableHead>
                      <TableHead>Preço Base (coins)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Última Atualização</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingConfig?.basePrices
                      ?.filter((p) => p.collection_types?.name !== "subscription")
                      .map((price) => (
                        <TableRow key={price.collection_types?.name}>
                          <TableCell className="font-medium">
                            {price.collection_types?.name === "standard_catalog"
                              ? "Catálogo Padrão"
                              : "Catálogo Premium"}
                          </TableCell>
                          <TableCell className="text-lg font-bold">
                            {price.base_price_coins} coins
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">Ativo</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date().toLocaleDateString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Multiplicadores por Contexto de Usuário</CardTitle>
                <CardDescription>
                  Ajustes aplicados à base de 200 coins dependendo do contexto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contexto</TableHead>
                      <TableHead>Multiplicador</TableHead>
                      <TableHead>Acréscimo</TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingConfig?.multipliers?.map((mult) => {
                      const acrescimo =
                        mult.multiplier === 1.0
                          ? "0%"
                          : `+${Math.round((mult.multiplier - 1) * 100)}%`;

                      return (
                        <TableRow key={mult.user_context}>
                          <TableCell className="font-medium">
                            {mult.user_context === "subscribed_chosen"
                              ? "Assinante - Coleção Escolhida"
                              : mult.user_context === "subscribed_not_chosen"
                                ? "Assinante - Outra Coleção"
                                : "Sem Assinatura"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">×{mult.multiplier}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={mult.multiplier === 1.0 ? "default" : "secondary"}
                              className={mult.multiplier === 1.0 ? "bg-green-600" : ""}
                            >
                              {acrescimo}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {mult.description}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exemplos de Cálculo</CardTitle>
                <CardDescription>Como os preços finais são calculados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-600" />
                    Coleção Ativa (Base de Referência)
                  </h4>
                  <div className="text-sm space-y-1 font-mono">
                    <p>Base: 200 coins (referência)</p>
                    <p>Multiplicador: ×1.0 (sem acréscimo)</p>
                    <p>Cálculo: 200 × 1.0</p>
                    <p className="font-bold text-yellow-700">Final: 200 coins ✓</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    Coleção Secundária (+20%)
                  </h4>
                  <div className="text-sm space-y-1 font-mono">
                    <p>Base: 200 coins</p>
                    <p>Multiplicador: ×1.2 (+20%)</p>
                    <p>Cálculo: 200 × 1.2</p>
                    <p className="font-bold text-blue-700">Final: 240 coins ✓</p>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-purple-600" />
                    Catálogo Geral (+50%)
                  </h4>
                  <div className="text-sm space-y-1 font-mono">
                    <p>Base: 200 coins</p>
                    <p>Multiplicador: ×1.5 (+50%)</p>
                    <p>Cálculo: 200 × 1.5</p>
                    <p className="font-bold text-purple-700">Final: 300 coins ✓</p>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-600" />
                    Premium (+125%)
                  </h4>
                  <div className="text-sm space-y-1 font-mono">
                    <p>Base: 200 coins</p>
                    <p>Multiplicador: ×2.25 (+125%)</p>
                    <p>Cálculo: 200 × 2.25</p>
                    <p className="font-bold text-orange-700">Final: 450 coins ✓</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preços Contextuais */}
          <TabsContent value="contextual" className="space-y-6">
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-purple-900">
                    Sistema de Preços Contextuais
                  </CardTitle>
                </div>
                <CardDescription className="text-purple-800">
                  Configure preços base por tipo de coleção, multiplicadores de contexto e descontos. 
                  O sistema calcula automaticamente os preços finais baseado no contexto do usuário.
                </CardDescription>
              </CardHeader>
            </Card>

            <ContextualPricingManager />
          </TabsContent>

          {/* Preços Avulsos (em R$) */}
          <TabsContent value="standalone" className="space-y-6">
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-green-900">
                    Preços Avulsos (em R$)
                  </CardTitle>
                </div>
                <CardDescription className="text-green-800">
                  Preços em reais para compras avulsas de personagens. Usado para clientes não assinantes, 
                  cálculo de cancelamento e cards do catálogo.
                </CardDescription>
              </CardHeader>
            </Card>

            <EditStandalonePricingForm />
          </TabsContent>

          {/* Pacotes */}
          <TabsContent value="packages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pacotes de Coins Disponíveis</CardTitle>
                <CardDescription>Pacotes configurados para venda na plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Coins</TableHead>
                      <TableHead>Bônus</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.packages.map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell className="font-medium">{pkg.name}</TableCell>
                        <TableCell>{pkg.amount.toLocaleString("pt-BR")}</TableCell>
                        <TableCell>
                          {pkg.bonus > 0 ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              +{pkg.bonus}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="font-bold">
                          {(pkg.amount + pkg.bonus).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>R$ {pkg.price_brl.toFixed(2)}</TableCell>
                        <TableCell>
                          {pkg.is_active ? (
                            <Badge variant="default">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transações */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transações Recentes</CardTitle>
                <CardDescription>Últimas 10 transações do sistema</CardDescription>
              </CardHeader>
              <CardContent>
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
                    {stats?.transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          {new Date(tx.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              tx.transaction_type === "purchase" ||
                              tx.transaction_type === "bonus"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {tx.transaction_type}
                          </Badge>
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
              </CardContent>
            </Card>
          </TabsContent>
      </Tabs>
    </div>
  );
}
