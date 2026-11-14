import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Coins } from "lucide-react";
import { PUBLIC_ROUTES, TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--gold-accent))]";

export function CollectorBenefits({ coinsAvailable }: { coinsAvailable: boolean }) {
  const [amount, setAmount] = useState("300");
  const value = Number(amount);
  const valid = amount.trim() !== "" && Number.isFinite(value) && value >= 50 && value <= 1000000;

  return (
    <section aria-label="Pré-venda e Coins TONART" className="px-5 pb-12 pt-4 sm:px-8 sm:pb-20">
      <div className="mx-auto grid max-w-6xl border-y border-[hsl(0,0%,18%)] lg:grid-cols-[1.65fr_1fr]">
        <article id="pre-venda" aria-labelledby="preorder-title" className="min-w-0 scroll-mt-24 py-9 sm:py-12 lg:pr-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))]">01 / Pré-venda TONART</p>
          <div className="mt-6 grid items-start gap-6 sm:grid-cols-[1fr_auto]">
            <div>
              <h2 id="preorder-title" className="max-w-sm text-4xl font-black uppercase leading-none tracking-wide sm:text-5xl" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>Escolha agora.<br />Complete depois.</h2>
              <p className="mt-5 max-w-sm text-sm leading-7 text-[hsl(0,0%,67%)]">Comece sua próxima peça com uma entrada. O valor é abatido integralmente, e você paga o restante na finalização.</p>
            </div>
            <div className="border-l border-[hsl(var(--gold-accent)/0.4)] pl-5 sm:pl-7">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[hsl(0,0%,60%)]">Entrada</p>
              <p className="mt-2 whitespace-nowrap text-[hsl(var(--gold-accent))]"><span className="mr-2 text-xl">R$</span><span className="text-7xl font-black leading-none sm:text-8xl" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>50</span></p>
              <p className="mt-2 text-xs text-[hsl(0,0%,60%)]">no pedido</p>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link to={PUBLIC_ROUTES.contact + "?assunto=pre-venda"} className={"inline-flex min-h-12 items-center justify-center gap-4 bg-[hsl(var(--gold-accent))] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-black hover:brightness-110 " + focus}>Solicitar pré-venda <ArrowRight size={16} aria-hidden="true" /></Link>
            <span className="text-xs text-[hsl(0,0%,60%)]">Valor e prazo confirmados no orçamento.</span>
          </div>
          <details className="mt-6 border-t border-[hsl(0,0%,15%)] pt-2">
            <summary className={"min-h-11 cursor-pointer py-3 text-xs text-[hsl(0,0%,75%)] " + focus}>Entenda a entrada e simule o saldo</summary>
            <div className="mt-2 max-w-lg space-y-4 pb-3 text-sm text-[hsl(0,0%,70%)]">
              <p className="leading-6">Em uma peça de R$300, são R$50 no pedido e R$250 na finalização. A entrada faz parte do preço; não é uma taxa extra.</p>
              <label htmlFor="preorder-value" className="flex flex-wrap items-center justify-between gap-3"><span>Valor da peça (R$)</span><input id="preorder-value" type="number" inputMode="decimal" min="50" max="1000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} aria-invalid={!valid} aria-describedby="preorder-result" className={"min-h-11 w-32 border border-[hsl(0,0%,25%)] bg-[hsl(0,0%,7%)] px-3 text-base text-white " + focus} /></label>
              <p id="preorder-result" aria-live="polite" className="border-l-2 border-[hsl(var(--gold-accent))] pl-3">{valid ? "R$50 de entrada + " + currency.format(Math.round((value - 50) * 100) / 100) + " na finalização." : "Informe um valor entre R$50 e R$1.000.000."}</p>
              <p className="text-xs leading-6 text-[hsl(0,0%,60%)]">Simulação ilustrativa. A equipe confirma a pré-venda após o aceite do orçamento e a confirmação da entrada.</p>
            </div>
          </details>
        </article>

        <article id="tonart-coins" aria-labelledby="coins-title" className="flex min-w-0 scroll-mt-24 flex-col border-t border-[hsl(0,0%,18%)] py-9 sm:py-12 lg:border-l lg:border-t-0 lg:pl-10">
          <div className="flex items-center justify-between gap-4"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))]">02 / TONART Coins</p><Coins size={24} strokeWidth={1.3} aria-hidden="true" className="text-[hsl(var(--gold-accent))]" /></div>
          <h2 id="coins-title" className="mt-6 text-4xl font-black uppercase leading-none tracking-wide sm:text-5xl" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>Sua carteira.<br />Sua coleção.</h2>
          <p className="mt-5 text-sm leading-7 text-[hsl(0,0%,67%)]">Seus créditos TONART, organizados na mesma conta. Consulte o saldo e acompanhe cada movimentação.</p>
          <ul className="my-6 space-y-3 text-sm text-[hsl(0,0%,80%)]">{["Saldo disponível em um só lugar", "Histórico de créditos e utilizações", "Acesso pela sua conta TONART"].map((text) => <li key={text} className="flex items-center gap-3"><span aria-hidden="true" className="h-1 w-1 shrink-0 bg-[hsl(var(--gold-accent))]" />{text}</li>)}</ul>
          <Link to={coinsAvailable ? TONECOS_COMMERCIAL_ROUTES.coins : PUBLIC_ROUTES.contact + "?assunto=coins"} className={"mt-auto inline-flex min-h-11 items-center justify-between gap-4 border-b border-[hsl(var(--gold-accent)/0.4)] py-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--gold-accent))] hover:border-[hsl(var(--gold-accent))] " + focus}>{coinsAvailable ? "Acessar minha carteira" : "Consultar meus Coins"}<ArrowRight size={16} aria-hidden="true" /></Link>
          <p className="mt-3 text-xs leading-6 text-[hsl(0,0%,55%)]">Créditos virtuais sem conversão em dinheiro. A entrada da pré-venda é paga em reais.</p>
        </article>
      </div>
    </section>
  );
}
