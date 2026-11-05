import { useState, type FormEvent } from "react";
import {
  creditTonecosCoins, findTonecosCoinRecipient,
  type TonecosCoinRecipient,
} from "@/services/coins/tonecos-coins-service";
import { actionClass, CommercialPage, fieldClass, panelClass, secondaryClass } from "./CommercialPage";

const formatted = new Intl.NumberFormat("pt-BR");
export default function TonecosAdminCoinsPage() {
  const [email, setEmail] = useState("");
  const [recipient, setRecipient] = useState<TonecosCoinRecipient | null>(null);
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [refKey, setRefKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function find(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice(""); setRecipient(null); setRefKey(null);
    try {
      const person = await findTonecosCoinRecipient(email);
      if (!person) { setNotice("Nenhum cliente encontrado com esse e-mail."); return; }
      setRecipient(person);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Busca não autorizada.");
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
      setError(err instanceof Error ? err.message : "Não foi possível registrar o crédito.");
    } finally { setBusy(false); }
  }

  return <CommercialPage title="Administração de moedas"
    intro="Área restrita da Tonecos. Os créditos são lançamentos virtuais auditáveis, não pagamentos, compras, transferências nem dinheiro.">
    <div className="max-w-3xl space-y-6">
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
    </div>
  </CommercialPage>;
}
