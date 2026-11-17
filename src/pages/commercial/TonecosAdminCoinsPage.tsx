import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, RotateCcw } from "lucide-react";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import {
  creditTonecosCoins, findTonecosCoinRecipient, reverseTonecosCoinEntry,
  type TonecosCoinRecipient,
} from "@/services/coins/tonecos-coins-service";
import { tonecosCoinsErrorText } from "@/services/coins/tonecos-coins-error-text";
import { getTonartAdminOverview, type TonartAdminCoinEntry } from "@/services/admin/overview/tonart-admin-workspace-service";
import { actionClass, CommercialPage, fieldClass, panelClass, secondaryClass } from "./CommercialPage";

const formatted = new Intl.NumberFormat("pt-BR");
const coinAmount = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ledgerDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });
const entryLabels: Record<TonartAdminCoinEntry["type"], string> = {
  admin_credit: "Crédito administrativo",
  purchase_spend: "Compra extra",
  refund: "Estorno",
  shipment_bonus: "Bônus por envio",
  purchase_reversal: "Reversão de compra",
  bonus_reversal: "Reversão de bônus",
  legacy_import: "Histórico anterior",
};

export default function TonecosAdminCoinsPage() {
  const [email, setEmail] = useState("");
  const [recipient, setRecipient] = useState<TonecosCoinRecipient | null>(null);
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [refKey, setRefKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ledger, setLedger] = useState<TonartAdminCoinEntry[]>([]);
  const [ledgerError, setLedgerError] = useState("");
  const [ledgerBusy, setLedgerBusy] = useState(true);
  const [ledgerReload, setLedgerReload] = useState(0);
  const [reversalReason, setReversalReason] = useState<Record<string, string>>({});
  const [reversingId, setReversingId] = useState<string | null>(null);
  const reversedEntryIds = useMemo(
    () => new Set(ledger.map((entry) => entry.reversesEntryId).filter((id): id is string => Boolean(id))),
    [ledger],
  );

  useEffect(() => {
    let active = true;
    setLedgerBusy(true);
    setLedgerError("");
    getTonartAdminOverview()
      .then((overview) => { if (active) setLedger(overview.recentCoinEntries); })
      .catch((cause: unknown) => {
        if (active) setLedgerError(tonecosCoinsErrorText(cause, "admin"));
      })
      .finally(() => { if (active) setLedgerBusy(false); });
    return () => { active = false; };
  }, [ledgerReload]);

  async function find(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice(""); setRecipient(null); setRefKey(null);
    try {
      const person = await findTonecosCoinRecipient(email);
      if (!person) { setNotice("Nenhum cliente encontrado com esse e-mail."); return; }
      setRecipient(person);
    } catch (err) {
      setError(tonecosCoinsErrorText(err, "admin"));
    } finally { setBusy(false); }
  }

  async function credit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !recipient) return;
    setBusy(true); setError(""); setNotice("");
    // Preserve the same key after a network error: retry cannot double-credit.
    const key = refKey ?? crypto.randomUUID();
    setRefKey(key);
    try {
      const result = await creditTonecosCoins({
        userId: recipient.id, amount: Number(amount), referenceKey: key, reason,
      });
      setNotice(result.idempotent
        ? "Este crédito já foi registrado anteriormente. Nenhuma moeda adicional foi emitida."
        : formatted.format(result.credited) + " moedas registradas. Saldo atual: " +
          formatted.format(result.balance) + ".");
      setRefKey(null); setReason(""); setAmount("1");
    } catch (err) {
      setError(tonecosCoinsErrorText(err, "admin"));
    } finally { setBusy(false); }
  }

  async function reverse(entry: TonartAdminCoinEntry) {
    const reason = reversalReason[entry.id]?.trim() ?? "";
    if (reversingId || reason.length < 4) return;
    setReversingId(entry.id); setError(""); setNotice("");
    try {
      const result = await reverseTonecosCoinEntry({ entryId: entry.id, reason });
      setNotice(result.idempotent
        ? `A reversão desta movimentação já estava registrada. Saldo atual: ${coinAmount.format(result.balance)} Coins.`
        : `Movimentação revertida. Saldo atual: ${coinAmount.format(result.balance)} Coins.`);
      setReversalReason((current) => ({ ...current, [entry.id]: "" }));
      setLedgerReload((value) => value + 1);
    } catch (cause) {
      setError(tonecosCoinsErrorText(cause, "admin"));
    } finally {
      setReversingId(null);
    }
  }

  return <CommercialPage title="Administração de moedas"
    intro="Área restrita da TONART Studio. Os créditos são lançamentos virtuais auditáveis, não pagamentos, compras, transferências nem dinheiro.">
    <div className="max-w-3xl space-y-6">
      <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.adminHome}>Voltar ao painel administrativo</Link>
      {error && <p role="alert" className="border border-red-500/40 p-4 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="border border-white/20 p-4 text-sm text-white/80">{notice}</p>}
      <form className={panelClass + " space-y-4"} onSubmit={(event) => { void find(event); }}>
        <h2 className="text-lg font-semibold">Localizar cliente</h2>
        <label className="block space-y-2 text-sm">
          <span>E-mail exato</span>
          <input className={fieldClass} type="email" required maxLength={320}
            autoComplete="off" value={email} onChange={(event) => {
              setEmail(event.target.value); setRecipient(null); setRefKey(null);
            }}/>
        </label>
        <button className={secondaryClass} disabled={busy} type="submit">
          {busy ? "Verificando..." : "Localizar"}
        </button>
      </form>
      {recipient && <form className={panelClass + " space-y-5"}
        onSubmit={(event) => { void credit(event); }}>
        <h2 className="text-lg font-semibold">Registrar crédito</h2>
        <p className="text-sm text-white/70">{recipient.fullName || "Cliente"} · {recipient.email}</p>
        <label className="block space-y-2 text-sm">
          <span>Quantidade de moedas</span>
          <input className={fieldClass} type="number" min={1} max={10000} step={1} required
            value={amount} onChange={(event) => { setAmount(event.target.value); setRefKey(null); }}/>
        </label>
        <label className="block space-y-2 text-sm">
          <span>Justificativa do crédito</span>
          <textarea className={fieldClass + " min-h-24"} required minLength={4} maxLength={500}
            value={reason} onChange={(event) => { setReason(event.target.value); setRefKey(null); }}/>
        </label>
        <p className="text-xs text-white/55">Operação restrita e permanente. A mesma solicitação não pode ser creditada duas vezes.</p>
        <button className={actionClass} type="submit" disabled={busy || reason.trim().length < 4}>
          {busy ? "Registrando..." : "Confirmar crédito"}
        </button>
      </form>}
      <section className={panelClass + " space-y-4"} aria-labelledby="coin-ledger-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="coin-ledger-title" className="text-lg font-semibold">Movimentações recentes</h2>
            <p className="mt-1 text-sm text-white/60">Reversões preservam o histórico e corrigem apenas o saldo de Coins.</p>
          </div>
          <button className={secondaryClass} type="button" onClick={() => setLedgerReload((value) => value + 1)} disabled={ledgerBusy}>
            <RefreshCw className="mr-2 inline h-4 w-4" aria-hidden="true" />Atualizar
          </button>
        </div>
        <p className="border-l-2 border-amber-300/70 pl-3 text-xs leading-5 text-white/60">
          Reverter Coins não cancela pedidos nem devolve valores em reais. Bônus só pode ser retirado se o saldo continuar não negativo.
        </p>
        {ledgerBusy ? <p role="status" className="text-sm text-white/60">Consultando o ledger...</p> : null}
        {ledgerError && <div role="alert" className="space-y-3 text-sm text-red-200">
          <p>{ledgerError}</p>
          <button className={secondaryClass} type="button" onClick={() => setLedgerReload((value) => value + 1)}>Tentar novamente</button>
        </div>}
        {!ledgerBusy && !ledgerError && ledger.length === 0 && <p className="text-sm text-white/60">Nenhuma movimentação registrada.</p>}
        {!ledgerBusy && !ledgerError && ledger.length > 0 && <ul className="space-y-3">
          {ledger.map((entry) => {
            const canReverse = entry.type === "purchase_spend" || entry.type === "shipment_bonus";
            return <li key={entry.id} className="rounded-sm border border-white/15 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{entryLabels[entry.type]} · {entry.userEmail ?? "Cliente"}</p>
                  <p className="mt-1 break-words text-sm text-white/65">{entry.reason}</p>
                  <p className="mt-1 text-xs text-white/45">{ledgerDate.format(new Date(entry.createdAt))}</p>
                </div>
                <span className={"font-mono tabular-nums " + (entry.delta > 0 ? "text-[hsl(var(--gold-accent))]" : "text-white/75")}>
                  {entry.delta > 0 ? "+" : ""}{coinAmount.format(entry.delta)} Coins
                </span>
              </div>
              {canReverse && (reversedEntryIds.has(entry.id) ? (
                <p className="mt-3 text-xs text-emerald-200">Reversão já registrada no ledger.</p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label className="block space-y-2 text-sm">
                    <span>Motivo da reversão</span>
                    <textarea className={fieldClass + " min-h-20"} required minLength={4} maxLength={500}
                      value={reversalReason[entry.id] ?? ""}
                      onChange={(event) => setReversalReason((current) => ({ ...current, [entry.id]: event.target.value }))} />
                  </label>
                  <button className={secondaryClass} type="button"
                    disabled={Boolean(reversingId) || (reversalReason[entry.id] ?? "").trim().length < 4}
                    onClick={() => { void reverse(entry); }}>
                    <RotateCcw className="mr-2 inline h-4 w-4" aria-hidden="true" />
                    {reversingId === entry.id ? "Revertendo..." : "Reverter lançamento"}
                  </button>
                </div>
              ))}
            </li>;
          })}
        </ul>}
      </section>
    </div>
  </CommercialPage>;
}
