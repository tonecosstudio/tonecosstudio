import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyTonecosCoinBalance, listMyTonecosCoinEntries,
  type TonecosCoinBalance, type TonecosCoinEntry,
} from "@/services/coins/tonecos-coins-service";
import { getTonecosCurrentUser } from "@/services/customer/tonecos-account-service";
import { isTonecosCoinsAuthError, tonecosCoinsErrorText } from "@/services/coins/tonecos-coins-error-text";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import {
  actionClass,
  CommercialPage,
  panelClass,
  secondaryClass,
} from "./CommercialPage";

const format = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PAGE_SIZE = 25;
const types: Record<TonecosCoinEntry["type"], string> = {
  admin_credit: "Crédito",
  purchase_spend: "Compra extra",
  refund: "Estorno",
  shipment_bonus: "Bônus por envio",
  purchase_reversal: "Estorno de compra",
  bonus_reversal: "Estorno de bônus",
  legacy_import: "Histórico anterior",
};

export default function TonecosCoinsPage() {
  const [guest, setGuest] = useState<boolean | null>(null);
  const [balance, setBalance] = useState<TonecosCoinBalance | null>(null);
  const [entries, setEntries] = useState<TonecosCoinEntry[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [reload, setReload] = useState(0);
  const [offset, setOffset] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    let active = true;
    setBusy(true); setError("");
    setSessionExpired(false);
    getTonecosCurrentUser().then(async (identity) => {
      if (!active) return;
      if (!identity) { setGuest(true); return; }
      setGuest(false);
      const [wallet, movements] = await Promise.all([
        getMyTonecosCoinBalance(), listMyTonecosCoinEntries(PAGE_SIZE, offset),
      ]);
      if (active) { setBalance(wallet); setEntries(movements); }
    }).catch((err: unknown) => {
      if (active) {
        setError(tonecosCoinsErrorText(err));
        setSessionExpired(isTonecosCoinsAuthError(err));
      }
    }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [reload, offset]);

  return (
    <CommercialPage title="Minha carteira TONART" intro="Coins são bônus e créditos para ofertas extras elegíveis em toda a TONART. Em ofertas habilitadas, cada Coin vale R$ 1 e você pode completar o pagamento em reais; o frete é pago à parte. Orçamentos, entrada de pré-venda e parcelas de plano não aceitam Coins.">
      {busy && <p role="status">Consultando histórico de moedas...</p>}
      {guest === true && !busy && <div className={panelClass}>
        <p className="mb-4 text-white/70">Entre para consultar suas moedas.</p>
        <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.login + "?next=" + encodeURIComponent(TONECOS_COMMERCIAL_ROUTES.coins)}>Entrar</Link>
      </div>}
      {error && !busy && <div role="alert" className={panelClass + " max-w-3xl"}>
        <p className="mb-3 text-red-200">{error}</p>
        {sessionExpired ? (
          <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.login + "?next=" + encodeURIComponent(TONECOS_COMMERCIAL_ROUTES.coins)}>Entrar novamente</Link>
        ) : (
          <button className={secondaryClass} type="button" onClick={() => setReload((x) => x + 1)}>Tentar novamente</button>
        )}
      </div>}
      {balance && !busy && !error && !guest && <>
        <div className="grid gap-4 sm:grid-cols-3" aria-label="Resumo de moedas">
          <div className={panelClass}>
            <p className="text-xs uppercase tracking-widest text-white/50">Saldo disponível</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-[hsl(var(--gold-accent))]">{format.format(balance.balance)} <span className="text-sm">Coins</span></p>
          </div>
          <div className={panelClass}>
            <p className="text-xs uppercase tracking-widest text-white/50">Entradas</p>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{format.format(balance.totalEarned)}</p>
          </div>
          <div className={panelClass}>
            <p className="text-xs uppercase tracking-widest text-white/50">Saídas</p>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{format.format(balance.totalSpent)}</p>
          </div>
        </div>
        {balance.balance > 0 && (
          <section
            className={
              panelClass +
              " mt-5 flex flex-col gap-4 border-[hsl(var(--gold-accent)/0.35)] sm:flex-row sm:items-center sm:justify-between"
            }
            aria-label="Usar Coins em uma oferta elegível"
          >
            <div className="max-w-2xl">
              <h2 className="text-base font-semibold">
                Use seu saldo em compras extras elegíveis
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Quando uma oferta tiver preço e elegibilidade configurados, você poderá pagar com Coins ou combinar Coins e reais. Preços e disponibilidade aparecem na própria oferta.
              </p>
            </div>
            <Link
              className={actionClass + " shrink-0"}
              to="/modelos"
            >
              Explorar modelos
            </Link>
          </section>
        )}
        <div className="mt-7 max-w-4xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Movimentações</h2>
              <p className="mt-1 text-xs text-white/50" role="status" aria-live="polite">
                {balance.entryCount > 0
                  ? `Mostrando ${offset + 1}–${Math.min(offset + entries.length, balance.entryCount)} de ${balance.entryCount}`
                  : "Histórico completo da carteira"}
              </p>
            </div>
            <button type="button" className={secondaryClass} onClick={() => {
              setOffset(0);
              setReload((x) => x + 1);
            }}>Atualizar</button>
          </div>
          {entries.length === 0 ? <div className={panelClass}>
            <p className="text-sm text-white/70">Nenhuma movimentação registrada.</p>
          </div> : <ul className="space-y-3">
            {entries.map((entry) => <li key={entry.id} className={panelClass + " flex flex-wrap items-start justify-between gap-3"}>
              <div>
                <p className="text-sm font-medium">{types[entry.type]}</p>
                <p className="mt-1 text-sm text-white/65">{entry.reason}</p>
                <p className="mt-2 text-xs text-white/45">{new Date(entry.createdAt).toLocaleDateString("pt-BR")}</p>
              </div>
              <span className={"font-mono text-lg tabular-nums " + (entry.delta > 0 ? "text-[hsl(var(--gold-accent))]" : "text-white/70")}>
                {entry.delta > 0 ? "+" : ""}{format.format(entry.delta)}
              </span>
            </li>)}
          </ul>}
          {balance.entryCount > PAGE_SIZE && entries.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className={secondaryClass}
                disabled={offset === 0 || busy}
                onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
              >
                Movimentações mais recentes
              </button>
              <button
                type="button"
                className={secondaryClass}
                disabled={offset + entries.length >= balance.entryCount || busy}
                onClick={() => setOffset((value) => value + PAGE_SIZE)}
              >
                Movimentações mais antigas
              </button>
            </div>
          )}
        </div>
      </>}
    </CommercialPage>
  );
}
