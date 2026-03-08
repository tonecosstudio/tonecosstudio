/**
 * Página de Compra de Coins
 *
 * Permite usuários comprarem pacotes de coins quando têm saldo insuficiente
 *
 * Spec: contextual-pricing-system
 * Task: 9A.5 (Página de Compra de Coins)
 */
// @ts-nocheck
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useUserCoins } from "@/hooks/useUserCoins";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Coins,
  ArrowLeft,
  Info,
  Sparkles,
  TrendingUp,
  Zap,
  Check,
  AlertTriangle,
} from "lucide-react";

// =====================================================
// TYPES
// =====================================================

interface CoinPackage {
  id: string;
  name: string;
  amount: number;
  bonus: number;
  price_brl: number;
  is_active: boolean;
  is_popular: boolean;
  is_best_value: boolean;
}

// =====================================================
// HOOKS
// =====================================================

function useCoinPackages() {
  return useQuery({
    queryKey: ["coin-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coin_packages")
        .select("*")
        .eq("is_active", true)
        .order("amount", { ascending: true });

      if (error) throw error;
      return data as CoinPackage[];
    },
  });
}

// =====================================================
// HELPERS
// =====================================================

function getTotalCoins(pkg: CoinPackage) {
  return pkg.amount + pkg.bonus;
}

function getBonusPercentage(pkg: CoinPackage) {
  if (pkg.bonus === 0) return 0;
  return Math.round((pkg.bonus / pkg.amount) * 100);
}

function formatPriceInCoins(amount: number) {
  return `${amount.toLocaleString("pt-BR")} coins`;
}

function formatPriceBRL(amount: number) {
  return `R$ ${amount.toFixed(2)}`;
}

// =====================================================
// COMPONENT
// =====================================================

export default function CoinsPurchase() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: coinsData, isLoading: coinsLoading } = useUserCoins(user?.id);
  const { data: packages, isLoading: packagesLoading } = useCoinPackages();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const isLoading = coinsLoading || packagesLoading;

  const handlePurchase = async (pkg: CoinPackage) => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para comprar coins",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!acceptedTerms) {
      toast({
        title: "Aceite os termos",
        description: "Você precisa aceitar os Termos de Uso para continuar",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setSelectedPackage(pkg.id);

    try {
      // TODO: Integrar com sistema de pagamento real (PIX/Stripe)
      // Por enquanto, simular compra
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const totalCoins = getTotalCoins(pkg);

      toast({
        title: "Compra realizada!",
        description: `Você recebeu ${formatPriceInCoins(totalCoins)}!`,
        variant: "default",
      });

      // Redirecionar de volta para catálogo
      navigate(-1);
    } catch (error) {
      console.error("Erro ao comprar coins:", error);
      toast({
        title: "Erro na compra",
        description: "Não foi possível processar sua compra. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setSelectedPackage(null);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={handleGoBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Comprar Coins</h1>
            <p className="text-muted-foreground">
              Escolha um pacote de coins para continuar suas compras
            </p>
          </div>

          {/* Current Balance */}
          {!isLoading && coinsData && (
            <Card className="w-48">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Saldo Atual</p>
                  <div className="flex items-center justify-center gap-2">
                    <Coins className="h-5 w-5 text-yellow-500" />
                    <span className="text-2xl font-bold">
                      {formatPriceInCoins(coinsData.balance)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="mb-8">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Coins são usados para comprar personagens no catálogo. Quanto maior o pacote, mais bônus
          você recebe!
        </AlertDescription>
      </Alert>

      {/* Legal Warning */}
      <Alert
        variant="default"
        className="mb-8 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
      >
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription>
          <div className="text-sm text-amber-900 dark:text-amber-100">
            <p className="font-semibold mb-2">⚠️ Regras Importantes sobre Coins</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Coins não possuem valor monetário e não podem ser convertidos em dinheiro</li>
              <li>Coins servem apenas para seleção de personagens na plataforma</li>
              <li>Coins são vinculados à sua assinatura ativa</li>
              <li>Coins não utilizados não são reembolsáveis isoladamente</li>
              <li>Coins expiram imediatamente em caso de cancelamento com reembolso</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <Coins className="h-12 w-12 mx-auto mb-4 animate-spin text-yellow-500" />
          <p className="text-muted-foreground">Carregando pacotes...</p>
        </div>
      )}

      {/* Terms Acceptance */}
      {!isLoading && packages && packages.length > 0 && (
        <div className="mb-6 flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
          <Checkbox
            id="accept-terms"
            checked={acceptedTerms}
            onCheckedChange={(checked: boolean) => setAcceptedTerms(checked)}
          />
          <label htmlFor="accept-terms" className="text-sm leading-relaxed cursor-pointer">
            Li e concordo com os{" "}
            <Link to="/terms" className="underline text-primary font-medium" target="_blank">
              Termos de Uso
            </Link>
            , incluindo as regras sobre coins (sem valor monetário, não reembolsáveis, não
            conversíveis em dinheiro, vinculados à assinatura)
          </label>
        </div>
      )}

      {/* Coin Packages Grid */}
      {!isLoading && packages && packages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {packages.map((pkg) => {
            const totalCoins = getTotalCoins(pkg);
            const bonusPercentage = getBonusPercentage(pkg);
            const isSelected = selectedPackage === pkg.id;

            return (
              <Card
                key={pkg.id}
                className={`relative transition-all hover:shadow-lg ${
                  pkg.is_best_value ? "border-primary border-2" : ""
                } ${isSelected ? "ring-2 ring-primary" : ""}`}
              >
                {/* Badges */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  {pkg.is_popular && (
                    <Badge variant="secondary" className="bg-blue-500 text-white">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                  {pkg.is_best_value && (
                    <Badge variant="secondary" className="bg-green-500 text-white">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Melhor Valor
                    </Badge>
                  )}
                </div>

                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="h-6 w-6 text-yellow-500" />
                    {formatPriceInCoins(pkg.amount)}
                  </CardTitle>
                  <CardDescription>{formatPriceBRL(pkg.price_brl)}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Bonus */}
                  {pkg.bonus > 0 && (
                    <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <Zap className="h-4 w-4" />
                        <span className="font-semibold">
                          +{formatPriceInCoins(pkg.bonus)} Bônus
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Total */}
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Total:</span>
                      <span className="text-lg font-bold">{formatPriceInCoins(totalCoins)}</span>
                    </div>
                    {pkg.bonus > 0 && (
                      <p className="text-xs text-muted-foreground">{bonusPercentage}% de bônus</p>
                    )}
                  </div>

                  {/* Purchase Button */}
                  <Button
                    className="w-full"
                    onClick={() => handlePurchase(pkg)}
                    disabled={isProcessing || !acceptedTerms}
                  >
                    {isProcessing && isSelected ? (
                      <>
                        <Coins className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Comprar
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!packages || packages.length === 0) && (
        <div className="text-center py-12">
          <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Nenhum pacote disponível no momento</p>
        </div>
      )}

      {/* Benefits Section */}
      <Card>
        <CardHeader>
          <CardTitle>Por que comprar coins?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Coins className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Preços Contextuais</h3>
                <p className="text-sm text-muted-foreground">
                  Personagens têm preços diferentes baseados em sua assinatura e coleções escolhidas
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Bônus Generosos</h3>
                <p className="text-sm text-muted-foreground">
                  Quanto maior o pacote, mais coins bônus você recebe gratuitamente
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Melhor Valor</h3>
                <p className="text-sm text-muted-foreground">
                  Pacotes maiores oferecem até 40% de bônus em coins
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Perguntas Frequentes</h2>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como funcionam os coins?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Coins são a moeda virtual usada para comprar personagens no catálogo. O preço de
                cada personagem varia baseado no tipo de coleção, sua assinatura e se você escolheu
                aquela coleção na sua assinatura.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Os coins expiram?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Não! Seus coins nunca expiram e ficam disponíveis na sua conta para uso a qualquer
                momento.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Posso reembolsar coins?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Não. Coins não possuem valor monetário e não podem ser reembolsados isoladamente.
                Coins servem exclusivamente para seleção de personagens na plataforma e são
                vinculados à sua assinatura. Em caso de cancelamento com reembolso da assinatura,
                apenas o valor da assinatura é reembolsado proporcionalmente aos personagens
                recebidos.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
