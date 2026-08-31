import { Page } from "@/components/layouts/Page";
import { ArcadeCard, ArcadeSectionTitle, GlitchText } from "@/components/arcade/ArcadeLayout";
import { FloatingParticles } from "@/components/arcade/ArcadeEffects";
import { useNavigate } from "react-router-dom";
import { useActiveCollectionPreviews } from "@/hooks/collections/usePublicCollections";
import { ArrowRight, Sparkles, Package, Shield, Zap } from "lucide-react";
import { PUBLIC_COLLECTIONS_ENABLED, PUBLIC_ROUTES } from "@/config/routes";
import { usePricingSettings } from "@/hooks/usePricingSettings";

export default function PreLaunchArcade() {
  const navigate = useNavigate();
  const { data: collections } = useActiveCollectionPreviews(3);
  const { data: pricingSettings, isLoading: pricingLoading, isError: pricingError } =
    usePricingSettings();

  const configuredDeposit = pricingSettings?.defaultDepositAmount;
  const depositAmount =
    Number.isFinite(configuredDeposit) && configuredDeposit != null && configuredDeposit > 0
      ? configuredDeposit
      : null;
  const pricingAvailable = depositAmount !== null && !pricingError;

  const benefits = [
    { icon: Zap, title: "ACESSO PRIORITARIO", desc: "Seja o primeiro a acompanhar os modelos liberados" },
    { icon: Shield, title: "PRECO GARANTIDO", desc: "Seu voucher mantem o valor original" },
    { icon: Package, title: "UNIVERSO ANTECIPADO", desc: "Acompanhe os primeiros modelos publicados" },
    { icon: Sparkles, title: "BONUS DE FUNDADOR", desc: "Badge exclusiva de fundador" },
  ];

  return (
    <Page
      title={pricingAvailable ? `Voucher ORDAX R$ ${depositAmount.toFixed(0)}` : "Voucher ORDAX"}
      description="Garanta seu voucher e acesso prioritario ao universo ORDAX."
      keywords={["pre-lancamento", "voucher", "universo", "ordax"]}
    >
      <section className="relative overflow-hidden px-6 py-20 md:py-32">
        <FloatingParticles />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, hsl(var(--gold-accent)), transparent 70%)" }}
        />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex animate-pulse items-center gap-2 border border-red-500/40 bg-red-500/10 px-4 py-1.5">
            <span
              className="font-mono text-[9px] uppercase tracking-[0.3em] text-red-400"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              🔴 OFERTA LIMITADA
            </span>
          </div>

          <h1
            className="mb-4 text-5xl font-black tracking-[0.15em] md:text-7xl lg:text-8xl"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              textShadow: "0 0 40px hsl(var(--gold-accent) / 0.15)",
            }}
          >
            <GlitchText text="PRÉ-LANÇAMENTO" />
          </h1>

          <p
            className="mx-auto mb-8 max-w-lg font-mono text-[10px] tracking-[0.15em] text-[hsl(0,0%,50%)] md:text-xs"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            {pricingLoading
              ? "CARREGANDO CONDICOES COMERCIAIS"
              : pricingAvailable
                ? `GARANTA SEU VOUCHER DE R$ ${depositAmount.toFixed(0)}`
                : "VOUCHER TEMPORARIAMENTE INDISPONIVEL"}
          </p>

          <div className="mb-8 inline-block">
            <div className="text-center">
              <p className="mb-1 font-mono text-[10px] tracking-wider text-[hsl(0,0%,40%)]">VOUCHER</p>
              <p
                className="text-5xl font-black text-[hsl(var(--gold-accent))] md:text-6xl"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                {pricingLoading ? "..." : pricingAvailable ? `R$ ${depositAmount.toFixed(0)}` : "INDISPONIVEL"}
              </p>
            </div>
          </div>

          {!pricingAvailable && !pricingLoading && (
            <p className="mx-auto mb-6 max-w-xl text-sm text-muted-foreground">
              Não foi possível validar o valor oficial do voucher. Nenhuma reserva ou cobrança será iniciada até a configuração comercial estar disponível.
            </p>
          )}

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => navigate(PUBLIC_ROUTES.login)}
              disabled={!pricingAvailable}
              className="inline-flex h-12 items-center gap-2 bg-[hsl(var(--gold-accent))] px-10 font-mono text-sm uppercase tracking-[0.15em] text-[hsl(0,0%,7%)] shadow-[0_0_20px_hsl(var(--gold-accent)/0.2)] transition-all hover:brightness-110 hover:shadow-[0_0_30px_hsl(var(--gold-accent)/0.4)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              GARANTIR MEU VOUCHER <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate(PUBLIC_ROUTES.catalog)}
              className="inline-flex h-11 items-center gap-2 border border-[hsl(var(--gold-accent)/0.3)] px-8 font-mono text-xs uppercase tracking-[0.15em] text-[hsl(var(--gold-accent))] transition-all hover:bg-[hsl(var(--gold-accent)/0.1)]"
            >
              VER UNIVERSO
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <ArcadeSectionTitle>VANTAGENS DO PRÉ-LANÇAMENTO</ArcadeSectionTitle>
        <div className="mb-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => (
            <ArcadeCard key={benefit.title} className="p-5">
              <benefit.icon className="mb-3 h-6 w-6 text-[hsl(var(--gold-accent))]" />
              <h3 className="mb-2 font-mono text-[10px] tracking-[0.15em] text-[hsl(var(--gold-accent))]">
                {benefit.title}
              </h3>
              <p className="font-mono text-[10px] leading-relaxed text-[hsl(0,0%,45%)]">{benefit.desc}</p>
            </ArcadeCard>
          ))}
        </div>

        <ArcadeSectionTitle>COMO FUNCIONA</ArcadeSectionTitle>
        <div className="mb-16 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { step: "01", title: "CADASTRE-SE", desc: "Crie sua conta e garanta seu lugar" },
            {
              step: "02",
              title: "PAGUE O VOUCHER",
              desc: pricingAvailable
                ? `Deposite R$ ${depositAmount.toFixed(0)} via PIX`
                : "O valor será exibido somente após validação da configuração oficial",
            },
            { step: "03", title: "RECEBA PRIMEIRO", desc: "Acesso prioritário quando lançarmos" },
          ].map((item) => (
            <ArcadeCard key={item.step} className="p-5">
              <span
                className="font-mono text-3xl font-black text-[hsl(var(--gold-accent)/0.2)]"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                {item.step}
              </span>
              <h3 className="mb-1 mt-2 font-mono text-[10px] tracking-[0.15em] text-[hsl(0,0%,80%)]">
                {item.title}
              </h3>
              <p className="font-mono text-[10px] leading-relaxed text-[hsl(0,0%,45%)]">{item.desc}</p>
            </ArcadeCard>
          ))}
        </div>

        {PUBLIC_COLLECTIONS_ENABLED && collections && collections.length > 0 && (
          <>
            <ArcadeSectionTitle>COLEÇÕES DISPONÍVEIS</ArcadeSectionTitle>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {collections.map((collection) => (
                <ArcadeCard key={collection.id} className="cursor-pointer overflow-hidden" hover>
                  <div className="aspect-video bg-[hsl(0,0%,8%)]">
                    {collection.cover_image_url ? (
                      <img
                        src={collection.cover_image_url}
                        alt={collection.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-8 w-8 text-[hsl(0,0%,15%)]" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3
                      className="mb-1 text-sm font-bold tracking-wider"
                      style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                    >
                      {collection.name}
                    </h3>
                    {collection.description && (
                      <p className="line-clamp-2 font-mono text-[10px] text-[hsl(0,0%,45%)]">
                        {collection.description}
                      </p>
                    )}
                  </div>
                </ArcadeCard>
              ))}
            </div>
          </>
        )}
      </section>
    </Page>
  );
}
