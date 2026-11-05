import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { answerCatalogQuoteRequest, listAdminCatalogQuotes, type AdminCatalogQuote } from "@/services/admin/config/catalog-quote-admin-service";
import { actionClass, CommercialPage, fieldClass, panelClass, secondaryClass } from "./CommercialPage";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export default function TonecosAdminQuotesPage() {
  const [quotes, setQuotes] = useState<AdminCatalogQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [price, setPrice] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    listAdminCatalogQuotes()
      .then((rows) => { if (active) setQuotes(rows); })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Acesso administrativo indisponível.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  async function reply(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (busyId) return;
    setBusyId(id); setError(""); setNotice("");
    try {
      const amount = Number((price[id] ?? "").trim().replace(",", "."));
      await answerCatalogQuoteRequest(id, amount);
      setNotice("Valor registrado. A solicitação foi marcada como respondida.");
      setAttempt((current) => current + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível responder ao orçamento.");
    } finally { setBusyId(null); }
  }

  return (
    <CommercialPage title="Atendimento de orçamentos" intro="Área restrita da Tonecos Studio. Verifique os modelos no catálogo antes de informar um valor. Nenhuma cobrança é iniciada automaticamente.">
      {notice && <p role="status" className="mb-5 max-w-3xl border border-white/20 p-4 text-sm">{notice}</p>}
      {error && <div role="alert" className="mb-5 max-w-3xl border border-red-500/40 p-4 text-sm text-red-200">
        <p>{error}</p>
        <button type="button" className={secondaryClass + " mt-3"} onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</button>
      </div>}
      {loading ? <p role="status">Verificando autorização e orçamentos...</p> : null}
      {!loading && !error && quotes.length === 0 ? <p className={panelClass}>Nenhuma solicitação recebida.</p> : null}
      {!loading && !error && <ul className="grid max-w-4xl gap-4">
        {quotes.map((quote) => (
          <li key={quote.id} className={panelClass}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Solicitação #{quote.id.slice(0, 8)}</h2>
              <span className="border border-white/20 px-3 py-1 text-xs">{quote.status}</span>
            </div>
            <p className="mb-3 text-xs text-white/55">Cliente {quote.userId.slice(0, 8)} · {new Date(quote.createdAt).toLocaleDateString("pt-BR")}</p>
            <ul className="space-y-2 text-sm">
              {quote.items.map((item) => (
                <li key={item.slug}>
                  <Link to={"/modelos/" + encodeURIComponent(item.slug)} className="text-[hsl(var(--gold-accent))] hover:underline">
                    {item.slug.replace(/-/g, " ")}
                  </Link> · {item.quantity} {item.quantity === 1 ? "unidade" : "unidades"}
                </li>
              ))}
            </ul>
            {quote.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-white/65">{quote.notes}</p>}
            <div className="mt-5 border-t border-white/15 pt-4">
              {quote.quotedAmount !== null ? (
                <p className="text-sm font-semibold">Valor informado: {brl.format(quote.quotedAmount)}</p>
              ) : (
                <form onSubmit={(event) => { void reply(event, quote.id); }} className="flex flex-wrap items-end gap-3">
                  <label className="block space-y-2 text-sm">
                    <span>Valor total (R$)</span>
                    <input aria-label={"Valor do orçamento " + quote.id.slice(0, 8)}
                      className={fieldClass} type="text" inputMode="decimal" required maxLength={12}
                      placeholder="Ex.: 249,90" value={price[quote.id] ?? ""}
                      onChange={(event) => setPrice((current) => ({ ...current, [quote.id]: event.target.value }))} />
                  </label>
                  <button type="submit" disabled={busyId !== null} className={actionClass}>
                    {busyId === quote.id ? "Salvando..." : "Responder com valor"}
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>}
    </CommercialPage>
  );
}
