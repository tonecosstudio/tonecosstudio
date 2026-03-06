import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/AdminLayout";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { 
  Coins, 
  Calculator, 
  Package, 
  Gift,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Sparkles,
  Info,
  TrendingUp
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CharacterPricesReference } from "@/components/admin/CharacterPricesReference";
import { PurchasingPowerCalculator } from "@/components/admin/PurchasingPowerCalculator";

interface PlanConfig {
  id?: string;
  plan_type: 'avulso' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';
  name: string;
  duration_months: number;
  price_per_month: number;
  total_price: number;
  
  // Peças
  base_pieces: number;
  bonus_pieces: number;
  total_pieces: number;
  
  // Coins
  coins_per_piece: number;
  coins_per_bonus_piece: number;
  base_credits: number;
  bonus_credits: number;
  total_credits: number;
  
  // Outros
  coin_unit_cost: number;
  deposit_amount?: number;
  is_active: boolean;
}

const PLAN_TYPES = [
  { key: 'avulso', label: 'Compra Avulsa', months: 0, icon: Package, color: 'bg-gray-500' },
  { key: 'bimestral', label: 'Bimestral', months: 2, icon: Calendar, color: 'bg-blue-500' },
  { key: 'trimestral', label: 'Trimestral', months: 3, icon: Calendar, color: 'bg-green-500' },
  { key: 'semestral', label: 'Semestral', months: 6, icon: Calendar, color: 'bg-purple-500' },
  { key: 'anual', label: 'Anual', months: 12, icon: Calendar, color: 'bg-orange-500' },
];

// Coin Exchange Rate Card Component
function CoinExchangeRateCard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [reaisAmount, setReaisAmount] = useState(500);
  const [coinsAmount, setCoinsAmount] = useState(100);

  // Fetch exchange rate
  const exchangeRateQuery = useQuery({
    queryKey: ["coin-exchange-rate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coin_exchange_rate')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const rate = exchangeRateQuery.data;
  const coinUnitValue = rate ? (rate.reais_amount / rate.coins_amount) : 5;

  // Update exchange rate
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!rate?.id) throw new Error('ID da cotação não encontrado');
      
      const { error } = await supabase
        .from('coin_exchange_rate')
        .update({
          reais_amount: reaisAmount,
          coins_amount: coinsAmount,
        })
        .eq('id', rate.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Cotação atualizada!",
        description: "A nova cotação do coin foi salva com sucesso.",
      });
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ["coin-exchange-rate"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar cotação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set initial values when data loads
  useEffect(() => {
    if (rate) {
      setReaisAmount(rate.reais_amount);
      setCoinsAmount(rate.coins_amount);
    }
  }, [rate]);

  return (
    <Card className="mb-8 border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-50 dark:from-yellow-950/20 dark:via-orange-950/20 dark:to-yellow-950/20 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg">
              <Coins className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold">Cotação do Coin</CardTitle>
              <CardDescription className="text-base mt-1">
                Taxa de câmbio fixa para conversão Real → Coin
              </CardDescription>
            </div>
          </div>
          <Button
            variant={isEditing ? "outline" : "default"}
            size="lg"
            onClick={() => {
              if (isEditing) {
                setReaisAmount(rate?.reais_amount || 500);
                setCoinsAmount(rate?.coins_amount || 100);
              }
              setIsEditing(!isEditing);
            }}
            className="shadow-md"
          >
            {isEditing ? "Cancelar" : "Editar Cotação"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Valor em Reais (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={reaisAmount}
                  onChange={(e) => setReaisAmount(parseFloat(e.target.value) || 0)}
                  className="text-xl h-14 shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">Quantidade de Coins</Label>
                <Input
                  type="number"
                  value={coinsAmount}
                  onChange={(e) => setCoinsAmount(parseInt(e.target.value) || 0)}
                  className="text-xl h-14 shadow-sm"
                />
              </div>
            </div>
            
            <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border-2 border-yellow-500/30 shadow-md">
              <p className="text-sm text-muted-foreground mb-3 font-semibold">Preview da nova cotação:</p>
              <div className="space-y-3">
                <p className="text-2xl font-bold text-yellow-600">
                  R$ {reaisAmount.toFixed(2)} = {coinsAmount} coins
                </p>
                <p className="text-xl text-muted-foreground">
                  1 coin = R$ {(reaisAmount / coinsAmount).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setReaisAmount(rate?.reais_amount || 500);
                  setCoinsAmount(rate?.coins_amount || 100);
                  setIsEditing(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                size="lg"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="shadow-md"
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar Cotação"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border-2 border-yellow-500/30 shadow-md hover:shadow-lg transition-shadow">
              <p className="text-sm text-muted-foreground mb-2 font-semibold">Equivalência</p>
              <p className="text-4xl font-bold text-yellow-600">
                R$ {rate?.reais_amount.toFixed(2) || '500.00'}
              </p>
              <p className="text-xl text-muted-foreground mt-2">
                = {rate?.coins_amount || 100} coins
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border-2 border-orange-500/30 shadow-md hover:shadow-lg transition-shadow">
              <p className="text-sm text-muted-foreground mb-2 font-semibold">Valor Unitário</p>
              <p className="text-4xl font-bold text-orange-600">
                R$ {coinUnitValue.toFixed(2)}
              </p>
              <p className="text-xl text-muted-foreground mt-2">
                por coin
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border-2 border-green-500/30 shadow-md hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1">
              <p className="text-sm text-muted-foreground mb-2 font-semibold">Exemplo</p>
              <p className="text-2xl font-semibold text-green-600">
                1.000 coins
              </p>
              <p className="text-xl text-muted-foreground mt-2">
                = R$ {(1000 * coinUnitValue).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPlansConfiguration() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("subscription-plans");

  // Fetch plans
  const plansQuery = useQuery({
    queryKey: ["admin-plans-configuration"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_credit_plans')
        .select('*')
        .order('duration_months', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const plans = plansQuery.data || [];

  // Calculate totals
  const totalMonthlyRevenue = plans
    .filter(p => p.is_active && p.plan_type !== 'avulso')
    .reduce((sum, p) => sum + (p.price || 0), 0);

  const totalPieces = plans
    .filter(p => p.is_active)
    .reduce((sum, p) => sum + (p.pieces_per_subscription || 0), 0);

  const totalCoins = plans
    .filter(p => p.is_active)
    .reduce((sum, p) => sum + (p.base_credits || 0) + (p.bonus_credits || 0), 0);

  return (
    <>
      <SEOHead
        title="Admin - Gestão de Planos & Preços"
        description="Central de configuração de planos de assinatura e preços de coleções"
        noindex={true}
      />

      <AdminLayout>
        {/* Header Moderno */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Gestão de Planos & Preços
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Configure planos de assinatura com créditos e níveis de preço para coleções
              </p>
            </div>
            <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 text-lg px-4 py-2 w-fit">
              <TrendingUp className="h-4 w-4 mr-2" />
              SSOT
            </Badge>
          </div>
        </div>

        {/* Tabs Principais */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 h-auto p-1">
            <TabsTrigger value="subscription-plans" className="flex items-center gap-2 py-3">
              <Coins className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Planos de Assinatura</div>
                <div className="text-xs text-muted-foreground">Sistema de coins e peças</div>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Planos de Assinatura com Coins */}
          <TabsContent value="subscription-plans" className="space-y-6">
            {/* Info Alert */}
            <Alert className="border-blue-500/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                <strong>Sistema de Assinatura com Créditos:</strong> Configure planos mensais/anuais com sistema de coins. 
                Assinantes recebem créditos para escolher personagens do catálogo. Defina peças base, bônus e cotação do coin.
              </AlertDescription>
            </Alert>

            {/* Character Prices Reference - INTEGRAÇÃO COM /admin/coins */}
            <CharacterPricesReference />

            {/* Coin Exchange Rate */}
            <CoinExchangeRateCard />

            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-2 hover:border-green-500/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Planos Ativos</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {plans.filter(p => p.is_active).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    de {plans.length} planos
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-green-500/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R$ {totalMonthlyRevenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    potencial
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-blue-500/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Peças</CardTitle>
                  <Package className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalPieces}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    por ciclo
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-yellow-500/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Coins</CardTitle>
                  <Coins className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalCoins}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    por ciclo
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Plans Configuration */}
            <div className="space-y-4">
              {PLAN_TYPES.map((planType) => {
                const existingPlan = plans.find(p => p.plan_type === planType.key);
                return (
                  <PlanConfigCard
                    key={planType.key}
                    planType={planType}
                    existingPlan={existingPlan}
                    onUpdate={() => qc.invalidateQueries({ queryKey: ["admin-plans-configuration"] })}
                  />
                );
              })}
            </div>
          </TabsContent>

          {/* Tab 2: Preços de Coleções - REMOVIDO */}
          {/* Movido para /admin/coins → Aba "Preços Contextuais" */}
          {/* Esta funcionalidade pertence ao SSOT de coins, não de planos */}
        </Tabs>
      </AdminLayout>
    </>
  );
}

// Plan Configuration Card Component
function PlanConfigCard({ planType, existingPlan, onUpdate }: any) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState<PlanConfig>({
    id: existingPlan?.id,
    plan_type: planType.key,
    name: existingPlan?.name || `Plano ${planType.label}`,
    duration_months: planType.months,
    price_per_month: existingPlan?.price || 0,
    total_price: 0,
    
    // Peças
    base_pieces: existingPlan?.pieces_per_subscription || 0,
    bonus_pieces: 0, // Será calculado
    total_pieces: 0,
    
    // Coins
    coins_per_piece: 100, // Padrão
    coins_per_bonus_piece: 100, // Padrão
    base_credits: existingPlan?.base_credits || 0,
    bonus_credits: existingPlan?.bonus_credits || 0,
    total_credits: 0,
    
    coin_unit_cost: 0,
    deposit_amount: existingPlan?.deposit_amount || (planType.key === 'avulso' ? 100 : 0),
    is_active: existingPlan?.is_active ?? false,
  });

  // Estado para tipo de bônus (carregado do banco ou padrão 'pieces')
  const [bonusType, setBonusType] = useState<'pieces' | 'coins'>(
    existingPlan?.bonus_type || 'pieces'
  );

  // Auto-calculate derived values
  const updateCalculations = (data: Partial<PlanConfig>) => {
    const updated = { ...formData, ...data };
    
    // Calculate total price
    if (planType.months > 0) {
      updated.total_price = updated.price_per_month * planType.months;
    } else {
      updated.total_price = updated.price_per_month;
    }
    
    // Calculate total pieces (apenas peças base se tipo for 'coins')
    if (bonusType === 'pieces') {
      updated.total_pieces = updated.base_pieces + updated.bonus_pieces;
    } else {
      updated.total_pieces = updated.base_pieces; // Sem peças bônus
    }
    
    // Calculate coins from pieces
    updated.base_credits = updated.base_pieces * updated.coins_per_piece;
    
    // Calculate bonus credits based on bonus type
    if (bonusType === 'pieces') {
      // Bônus em peças: calcula coins a partir das peças bônus
      updated.bonus_credits = updated.bonus_pieces * updated.coins_per_bonus_piece;
    }
    // Se bonusType === 'coins', bonus_credits já está definido diretamente
    
    updated.total_credits = updated.base_credits + updated.bonus_credits;
    
    // Calculate coin unit cost (price per coin)
    if (updated.total_credits > 0) {
      updated.coin_unit_cost = updated.total_price / updated.total_credits;
    }
    
    setFormData(updated);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const saveData = {
        plan_type: formData.plan_type,
        name: formData.name,
        duration_months: formData.duration_months,
        price: formData.price_per_month,
        base_credits: formData.base_credits,
        bonus_credits: formData.bonus_credits,
        deposit_amount: formData.deposit_amount,
        pieces_per_subscription: formData.total_pieces,
        bonus_type: bonusType, // Salvar tipo de bônus
        is_active: formData.is_active,
      };

      if (existingPlan?.id) {
        const { error } = await supabase
          .from('subscription_credit_plans')
          .update(saveData)
          .eq('id', existingPlan.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subscription_credit_plans')
          .insert([saveData]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Plano salvo com sucesso!",
        description: `${formData.name} foi atualizado.`,
      });
      setIsEditing(false);
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar plano",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const IconComponent = planType.icon;
  const isAvulso = planType.key === 'avulso';

  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${!formData.is_active && existingPlan ? "opacity-60" : ""} ${formData.is_active ? "border-2 border-primary/20" : ""}`}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 ${planType.color} rounded-xl shadow-md`}>
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                {planType.label}
                {formData.is_active && existingPlan && (
                  <Badge variant="default" className="ml-2">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Ativo
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-base mt-1">
                {isAvulso ? 'Compra única sem assinatura' : `${planType.months} meses de assinatura`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {existingPlan && (
              <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                <Label htmlFor={`active-${planType.key}`} className="text-sm font-medium cursor-pointer">
                  {formData.is_active ? 'Ativo' : 'Inativo'}
                </Label>
                <Switch
                  id={`active-${planType.key}`}
                  checked={formData.is_active}
                  onCheckedChange={(checked) => {
                    updateCalculations({ is_active: checked });
                    if (!isEditing) setIsEditing(true);
                  }}
                />
              </div>
            )}
            {!existingPlan && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                Não Configurado
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="pricing" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pricing">
              <DollarSign className="h-4 w-4 mr-2" />
              Valores
            </TabsTrigger>
            <TabsTrigger value="pieces">
              <Package className="h-4 w-4 mr-2" />
              Peças
            </TabsTrigger>
            <TabsTrigger value="coins">
              <Coins className="h-4 w-4 mr-2" />
              Moedas
            </TabsTrigger>
          </TabsList>

          {/* Tab: Valores Monetários */}
          <TabsContent value="pricing" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>
                  {isAvulso ? 'Preço Unitário (R$)' : 'Preço Mensal (R$)'}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price_per_month}
                  onChange={(e) => {
                    updateCalculations({ price_per_month: parseFloat(e.target.value) || 0 });
                    if (!isEditing) setIsEditing(true);
                  }}
                  placeholder="0.00"
                  className="mt-2"
                />
              </div>

              {!isAvulso && (
                <div>
                  <Label>Valor Total</Label>
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      {formData.price_per_month} × {planType.months} meses
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      R$ {formData.total_price.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {isAvulso && (
                <div>
                  <Label>Entrada Mínima (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.deposit_amount}
                    onChange={(e) => {
                      updateCalculations({ deposit_amount: parseFloat(e.target.value) || 0 });
                      if (!isEditing) setIsEditing(true);
                    }}
                    placeholder="100.00"
                    className="mt-2"
                  />
                </div>
              )}

              {formData.total_credits > 0 && (
                <div>
                  <Label>Custo por Coin</Label>
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-muted-foreground">
                      R$ / coins
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      R$ {formData.coin_unit_cost.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab: Peças */}
          <TabsContent value="pieces" className="space-y-4 mt-4">
            {/* Seletor de Tipo de Bônus */}
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <Label className="text-base font-semibold">Tipo de Bônus</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Escolha se o bônus será em peças extras ou coins extras
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={bonusType === 'pieces' ? 'default' : 'outline'}
                      onClick={() => {
                        setBonusType('pieces');
                        if (!isEditing) setIsEditing(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Package className="h-4 w-4" />
                      Peças Extras
                    </Button>
                    <Button
                      type="button"
                      variant={bonusType === 'coins' ? 'default' : 'outline'}
                      onClick={() => {
                        setBonusType('coins');
                        updateCalculations({ bonus_pieces: 0 }); // Zera peças bônus se escolher coins
                        if (!isEditing) setIsEditing(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Coins className="h-4 w-4" />
                      Coins Extras
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label>Peças Base</Label>
                <Input
                  type="number"
                  value={formData.base_pieces}
                  onChange={(e) => {
                    updateCalculations({ base_pieces: parseInt(e.target.value) || 0 });
                    if (!isEditing) setIsEditing(true);
                  }}
                  placeholder="0"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Peças principais
                </p>
              </div>

              {bonusType === 'pieces' ? (
                <div>
                  <Label>
                    <Gift className="h-3 w-3 inline mr-1" />
                    Peças Bônus
                  </Label>
                  <Input
                    type="number"
                    value={formData.bonus_pieces}
                    onChange={(e) => {
                      updateCalculations({ bonus_pieces: parseInt(e.target.value) || 0 });
                      if (!isEditing) setIsEditing(true);
                    }}
                    placeholder="0"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Peças extras
                  </p>
                </div>
              ) : (
                <div>
                  <Label>
                    <Sparkles className="h-3 w-3 inline mr-1" />
                    Coins Bônus Diretos
                  </Label>
                  <Input
                    type="number"
                    value={formData.bonus_credits}
                    onChange={(e) => {
                      const bonusCoins = parseInt(e.target.value) || 0;
                      setFormData(prev => ({
                        ...prev,
                        bonus_credits: bonusCoins,
                        total_credits: prev.base_credits + bonusCoins
                      }));
                      if (!isEditing) setIsEditing(true);
                    }}
                    placeholder="0"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Coins extras (não vinculados a peças)
                  </p>
                </div>
              )}

              <div>
                <Label>Total de Peças</Label>
                <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-950 rounded-md border border-purple-200 dark:border-purple-800">
                  <p className="text-sm text-muted-foreground">
                    {formData.base_pieces} {bonusType === 'pieces' ? `+ ${formData.bonus_pieces}` : '(sem bônus)'}
                  </p>
                  <p className="text-lg font-bold text-purple-600">
                    {formData.total_pieces} peças
                  </p>
                </div>
              </div>

              <div>
                <Label>Exemplo</Label>
                <div className="mt-2 p-3 bg-muted rounded-md text-xs">
                  <p className="font-semibold mb-1">Semestral:</p>
                  {bonusType === 'pieces' ? (
                    <>
                      <p>6 base + 1 bônus</p>
                      <p className="text-muted-foreground">= 7 peças total</p>
                    </>
                  ) : (
                    <>
                      <p>6 peças base</p>
                      <p className="text-green-600">+ 50 coins extras</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Moedas/Coins */}
          <TabsContent value="coins" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label>Coins por Peça Base</Label>
                <Input
                  type="number"
                  value={formData.coins_per_piece}
                  onChange={(e) => {
                    updateCalculations({ coins_per_piece: parseInt(e.target.value) || 0 });
                    if (!isEditing) setIsEditing(true);
                  }}
                  placeholder="100"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Coins por peça normal
                </p>
              </div>

              {bonusType === 'pieces' && (
                <div>
                  <Label>
                    <Sparkles className="h-3 w-3 inline mr-1" />
                    Coins por Peça Bônus
                  </Label>
                  <Input
                    type="number"
                    value={formData.coins_per_bonus_piece}
                    onChange={(e) => {
                      updateCalculations({ coins_per_bonus_piece: parseInt(e.target.value) || 0 });
                      if (!isEditing) setIsEditing(true);
                    }}
                    placeholder="100"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Coins por peça extra
                  </p>
                </div>
              )}

              <div>
                <Label>Coins Base</Label>
                <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-md border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-muted-foreground">
                    {formData.base_pieces} × {formData.coins_per_piece}
                  </p>
                  <p className="text-lg font-bold text-yellow-600">
                    {formData.base_credits} coins
                  </p>
                </div>
              </div>

              <div>
                <Label>Coins Bônus</Label>
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
                  {bonusType === 'pieces' ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {formData.bonus_pieces} × {formData.coins_per_bonus_piece}
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        {formData.bonus_credits} coins
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Coins extras diretos
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        {formData.bonus_credits} coins
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Total de Coins</Label>
                <div className="mt-2 p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">
                    Base + Bônus
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {formData.total_credits} coins
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.base_credits} + {formData.bonus_credits}
                  </p>
                </div>
              </div>

              <div>
                <Label>Distribuição</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Peças base:</span>
                    <span className="font-semibold">{formData.base_pieces} × {formData.coins_per_piece} = {formData.base_credits}</span>
                  </div>
                  {bonusType === 'pieces' ? (
                    <div className="flex justify-between text-green-600">
                      <span>Peças bônus:</span>
                      <span className="font-semibold">{formData.bonus_pieces} × {formData.coins_per_bonus_piece} = {formData.bonus_credits}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-green-600">
                      <span>Coins extras:</span>
                      <span className="font-semibold">+{formData.bonus_credits} coins</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>{formData.total_credits} coins</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Summary Box */}
        {formData.total_pieces > 0 && (
          <>
            <Separator className="my-6" />
            <div className="p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-xl border-2 border-primary/20 shadow-md">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary rounded-xl shadow-md">
                  <Calculator className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold mb-4">Resumo do Plano</h4>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                      <p className="text-sm text-muted-foreground mb-2 font-semibold">Investimento</p>
                      <p className="text-2xl font-bold text-green-600">R$ {formData.total_price.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                      <p className="text-sm text-muted-foreground mb-2 font-semibold">Custo/coin</p>
                      <p className="text-2xl font-bold text-blue-600">R$ {formData.coin_unit_cost.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                      <p className="text-sm text-muted-foreground mb-2 font-semibold">Peças totais</p>
                      <p className="text-2xl font-bold text-purple-600">{formData.total_pieces}</p>
                      <p className="text-xs text-muted-foreground mt-1">({formData.base_pieces}+{formData.bonus_pieces})</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                      <p className="text-sm text-muted-foreground mb-2 font-semibold">Coins totais</p>
                      <p className="text-2xl font-bold text-yellow-600">{formData.total_credits}</p>
                      <p className="text-xs text-muted-foreground mt-1">coins</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Purchasing Power Calculator - INTEGRAÇÃO COM /admin/coins */}
            {formData.total_credits > 0 && (
              <PurchasingPowerCalculator 
                totalCoins={formData.total_credits}
                planName={formData.name}
              />
            )}
          </>
        )}

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setIsEditing(false);
                window.location.reload();
              }}
              className="w-full sm:w-auto"
            >
              Cancelar Alterações
            </Button>
            <Button
              size="lg"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full sm:w-auto shadow-md"
            >
              {saveMutation.isPending ? "Salvando..." : "💾 Salvar Configurações"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
