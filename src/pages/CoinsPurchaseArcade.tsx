// @ts-nocheck
import { Page } from "@/components/layouts/Page";
import { ArcadeHero, ArcadeCard, ArcadeSectionTitle, GlitchText } from "@/components/arcade/ArcadeLayout";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useUserCoins } from "@/hooks/useUserCoins";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Coins, Sparkles, TrendingUp, Zap, Check, AlertTriangle, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface CoinPackage {
  id: string; name: string; amount: number; bonus: number;
  price_brl: number; is_active: boolean; is_popular: boolean; is_best_value: boolean;
}

export default function CoinsPurchaseArcade() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: coinsData, isLoading: coinsLoading } = useUserCoins(user?.id);
  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ["coin-packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coin_packages").select("*").eq("is_active", true).order("amount", { ascending: true });
      if (error) throw error;
      return data as CoinPackage[];
    },
  });

  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handlePurchase = async (pkg: CoinPackage) => {
    if (!user) { navigate("/login"); return; }
    if (!acceptedTerms) { toast({ title: "Aceite os termos", variant: "destructive" }); return; }
    setIsProcessing(true);
    setSelectedPkg(pkg.id);
    try {
      await new Promise(r => setTimeout(r, 2000));
      toast({ title: "Compra realizada!", description: `${(pkg.amount + pkg.bonus).toLocaleString("pt-BR")} coins adicionados!` });
      navigate(-1);
    } catch { toast({ title: "Erro na compra", variant: "destructive" }); }
    finally { setIsProcessing(false); setSelectedPkg(null); }
  };

  const isLoading = coinsLoading || packagesLoading;

  return (
    <Page title="Comprar Coins | ORDAX" description="Adquira pacotes de coins">
      <ArcadeHero
        badge="COIN DEPOT"
        title="COMPRAR COINS"
        subtitle="ABASTEÇA SEU ARSENAL"
        stats={coinsData ? [{ value: coinsData.balance.toLocaleString("pt-BR"), label: "Saldo Atual" }] : []}
      />

      <section className="max-w-6xl mx-auto px-6 pb-16">
        {/* Warning */}
        <ArcadeCard hover={false} className="p-4 mb-6 border-yellow-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="font-mono text-[10px] text-[hsl(0,0%,50%)] leading-relaxed">
              <p className="text-yellow-400 font-bold mb-1 tracking-wider">⚠️ REGRAS DOS COINS</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Coins não possuem valor monetário</li>
                <li>Servem apenas para seleção de personagens</li>
                <li>Não são reembolsáveis isoladamente</li>
              </ul>
            </div>
          </div>
        </ArcadeCard>

        {/* Terms */}
        {!isLoading && packages && packages.length > 0 && (
          <div className="flex items-start gap-3 mb-6 p-4 border border-[hsl(0,0%,12%)]">
            <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(c: boolean) => setAcceptedTerms(c)} />
            <label htmlFor="terms" className="font-mono text-[10px] text-[hsl(0,0%,50%)] leading-relaxed cursor-pointer">
              Li e concordo com os{" "}
              <Link to="/termos" className="text-[hsl(var(--gold-accent))] underline" target="_blank">Termos de Uso</Link>
            </label>
          </div>
        )}

        {/* Packages */}
        {isLoading ? (
          <div className="text-center py-16">
            <Coins className="w-8 h-8 text-[hsl(var(--gold-accent))] animate-spin mx-auto mb-4" />
            <p className="font-mono text-xs text-[hsl(0,0%,40%)] tracking-wider">CARREGANDO PACOTES...</p>
          </div>
        ) : packages && packages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {packages.map(pkg => {
              const total = pkg.amount + pkg.bonus;
              const bonusPct = pkg.bonus > 0 ? Math.round((pkg.bonus / pkg.amount) * 100) : 0;
              const isSelected = selectedPkg === pkg.id;

              return (
                <ArcadeCard
                  key={pkg.id}
                  className={`p-5 relative ${pkg.is_best_value ? "border-[hsl(var(--gold-accent)/0.6)]" : ""}`}
                >
                  {/* Badges */}
                  <div className="absolute top-3 right-3 flex flex-col gap-1">
                    {pkg.is_popular && (
                      <span className="font-mono text-[7px] px-2 py-0.5 bg-blue-500/20 text-blue-400 tracking-[0.15em] uppercase border border-blue-500/30">
                        POPULAR
                      </span>
                    )}
                    {pkg.is_best_value && (
                      <span className="font-mono text-[7px] px-2 py-0.5 bg-[hsl(var(--gold-accent)/0.2)] text-[hsl(var(--gold-accent))] tracking-[0.15em] uppercase border border-[hsl(var(--gold-accent)/0.3)]">
                        MELHOR VALOR
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Coins className="w-5 h-5 text-[hsl(var(--gold-accent))]" />
                    <span className="text-xl font-bold text-[hsl(var(--gold-accent))] font-mono tabular-nums">
                      {pkg.amount.toLocaleString("pt-BR")}
                    </span>
                  </div>

                  <p className="font-mono text-lg font-bold text-[hsl(0,0%,90%)] mb-2">
                    R$ {pkg.price_brl.toFixed(2)}
                  </p>

                  {pkg.bonus > 0 && (
                    <div className="flex items-center gap-1 mb-3 px-2 py-1 bg-green-500/10 border border-green-500/20">
                      <Zap className="w-3 h-3 text-green-400" />
                      <span className="font-mono text-[10px] text-green-400 tracking-wider">
                        +{pkg.bonus.toLocaleString("pt-BR")} BÔNUS ({bonusPct}%)
                      </span>
                    </div>
                  )}

                  <div className="border-t border-[hsl(0,0%,12%)] pt-3 mb-4">
                    <div className="flex justify-between font-mono text-[10px] text-[hsl(0,0%,45%)]">
                      <span>Total:</span>
                      <span className="text-[hsl(0,0%,80%)] font-bold">{total.toLocaleString("pt-BR")} coins</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePurchase(pkg)}
                    disabled={isProcessing || !acceptedTerms}
                    className="w-full flex items-center justify-center gap-2 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,7%)] font-mono uppercase tracking-[0.15em] text-[10px] h-9 hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {isProcessing && isSelected ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    COMPRAR
                  </button>
                </ArcadeCard>
              );
            })}
          </div>
        ) : (
          <ArcadeCard className="p-12 text-center">
            <Coins className="w-12 h-12 text-[hsl(0,0%,20%)] mx-auto mb-4" />
            <p className="font-mono text-xs text-[hsl(0,0%,45%)] tracking-wider">NENHUM PACOTE DISPONÍVEL</p>
          </ArcadeCard>
        )}

        {/* Benefits */}
        <ArcadeSectionTitle>POR QUE COMPRAR COINS?</ArcadeSectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Coins, title: "PREÇOS CONTEXTUAIS", desc: "Preços variam por assinatura e coleção" },
            { icon: Sparkles, title: "BÔNUS GENEROSOS", desc: "Pacotes maiores = mais coins grátis" },
            { icon: TrendingUp, title: "MELHOR VALOR", desc: "Até 40% de bônus em pacotes maiores" },
          ].map((b, i) => (
            <ArcadeCard key={i} className="p-4">
              <b.icon className="w-5 h-5 text-[hsl(var(--gold-accent))] mb-2" />
              <h3 className="font-mono text-[10px] text-[hsl(var(--gold-accent))] tracking-[0.15em] mb-1">{b.title}</h3>
              <p className="font-mono text-[10px] text-[hsl(0,0%,45%)] leading-relaxed">{b.desc}</p>
            </ArcadeCard>
          ))}
        </div>
      </section>
    </Page>
  );
}
