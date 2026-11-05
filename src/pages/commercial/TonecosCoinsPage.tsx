import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyTonecosCoinBalance, listMyTonecosCoinEntries,
  type TonecosCoinBalance, type TonecosCoinEntry,
} from "@/services/coins/tonecos-coins-service";
import { getTonecosCurrentUser } from "@/services/customer/tonecos-account-service";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import { CommercialPage, panelClass, secondaryClass } from "./CommercialPage";

const format = new Intl.NumberFormat("pt-BR");
const types: Record<TonecosCoinEntry["type"], string> = {
  admin_credit: "Crédito",
  purchase_spend: "Utilização",
  refund: "Estorno",
};

export default function TonecosCoinsPage() {
  const [guest, setGuest] = useState<boolean | null>(null);
  const [balance, setBalance] = useState<TonecosCoinBalance | null>(null);
  const [entries, setEntries] = useState<TonecosCoinEntry[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setBusy(true); setError("");
    getTonecosCurrentUser().then(async (identity) => {
      if (!active) return;
      if (!identity) { setGuest(true); return; }
      setGuest(false);
      const [wallet, movements] = await Promise.all([
        getMyTonecosCoinBalance(), listMyTonecosCoinEntries(25),
      ]);
      if (active) { setBalance(wallet); setEntries(movements); }
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar seu saldo.");
    }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [reload]);

  return (
    <CommercialPage title="Minhas moedas" intro="Acompanhe suas moedas virtuais e o histórico de movimentações da conta Tonecos. Moedas não representam saldo em reais e não há compra ou conversão habilitada.">
      {busy && <p role="status">Consultando histórico de moedas...</p>}
      {guest === true && !busy && <div className={panelClass}>
        <p className="mb-4 text-white/70">Entre para consultar suas moedas.</p>
        <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.login + "?next=" + encodeURIComponent(TONECOS_COMMERCIAL_ROUTES.coins)}>Entrar</Link>
      </div>}
      {error && !busy && <div role="alert" className={panelClass + " max-w-3xl"}>
        <p className="mb-3 text-red-200">Não foi possível consultar o saldo: {error}</p>
        <button className={secondaryClass} type="button" onClick={() => setReload((x) => x + 1)}>Tentar novamente</button>
      </div>}
      {balance && !busy && !error && !guest && <>
        <div className="grid gap-4 sm:grid-cols-3" aria-label="Resumo de moedas">
          <div className={panelClass}>
            <p className="text-xs uppercase tracking-widest text-white/50">Saldo disponível</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-[hsl(var(--gold-accent))]">{format.format(balance.balance)} <span className="text-sm">moedas</span></p>
          </div>
          <div className={panelClass}>
            <p className="text-xs uppercase tracking-widest text-white/50">Recebidas</p>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{format.format(balance.totalEarned)}</p>
          </div>
          <div className={panelClass}>
            <p className="text-xs uppercase tracking-widest text-white/50">Utilizadas</p>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{format.format(balance.totalSpent)}</p>
          </div>
        </div>
        <div className="mt-7 max-w-4xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Movimentações</h2>
            <button type="button" className={secondaryClass} onClick={() => setReload((x) => x + 1)}>Atualizar</button>
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
        </div>
      </>}
    </CommercialPage>
  );
}
