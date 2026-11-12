import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import { answerCatalogQuoteRequest, changeCatalogQuoteStatus, listAdminCatalogQuotes, type AdminCatalogQuote } from "@/services/admin/config/catalog-quote-admin-service";
import { actionClass, CommercialPage, fieldClass, panelClass, secondaryClass } from "./CommercialPage";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const statusLabels: Record<string,string> = {
  pending: "Novo", reviewing: "Em análise",
  answered: "Respondido", archived: "Arquivado",
};
export default function TonecosAdminQuotesPage() {
  const [params] = useSearchParams();
  const requestedId = params.get("quote");
  const selectedId = requestedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedId)
    ? requestedId.toLowerCase() : null;
  const invalidSelection = requestedId !== null && !selectedId;
  const [quotes, setQuotes] = useState<AdminCatalogQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [price, setPrice] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const visibleQuotes = invalidSelection ? [] : selectedId
    ? quotes.filter((quote) => quote.id.toLowerCase() === selectedId) : quotes;

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

  async function updateStatus(quoteId: string, status: "pending" | "reviewing" | "archived") {
    if (busyId) return;
    setBusyId(quoteId); setError(""); setNotice("");
    try {
      await changeCatalogQuoteStatus(quoteId, status);
      setNotice("Situação do orçamento atualizada.");
      setAttempt((current) => current + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar a situação.");
    } finally { setBusyId(null); }
  }

  return (
    <CommercialPage title="Atendimento de orçamentos" intro="Área restrita da TONART Studio. Verifique os modelos no catálogo antes de informar um valor. Nenhuma cobrança é iniciada automaticamente.">
      <div className="mb-6 flex flex-wrap gap-3">
        <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.adminHome}>Voltar ao painel administrativo</Link>
        {requestedId !== null && <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.adminQuotes}>Ver todos os orçamentos</Link>}
      </div>
      {notice && <p role="status" className="mb-5 max-w-3xl border border-white/20 p-4 text-sm">{notice}</p>}
      {error && <div role="alert" className="mb-5 max-w-3xl border border-red-500/40 p-4 text-sm text-red-200">
        <p>{error}</p>
        {error === "Admin access required" && <p className="mt-3 text-xs text-white/70">
          Acesso administrativo restrito. A autorização deve ser provisionada
          pela equipe após verificar a titularidade da conta.
        </p>}
        <button type="button" className={secondaryClass + " mt-3"}
          onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</button>
      </div>}
      {loading ? <p role="status">Verificando autorização e orçamentos...</p> : null}
      {!loading && !error && invalidSelection && (
        <p role="alert" className={panelClass}>Referência de orçamento inválida. Consulte a lista completa.</p>
      )}
      {!loading && !error && !invalidSelection && selectedId && visibleQuotes.length === 0 && (
        <p role="status" className={panelClass}>
          Esta solicitação não está entre as 50 mais recentes carregadas. Consulte todos os orçamentos.
        </p>
      )}
      {!loading && !error && !requestedId && quotes.length === 0 && <p className={panelClass}>Nenhuma solicitação recebida.</p>}
      {!loading && !error && <ul className="grid max-w-4xl gap-4">
        {visibleQuotes.map((quote) => (
          <li key={quote.id} className={panelClass}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Solicitação #{quote.id.slice(0, 8)}</h2>
              <span className="border border-white/20 px-3 py-1 text-xs">{statusLabels[quote.status] ?? "Em atualização"}</span>
            </div>
            <p className="mb-1 text-sm text-white/80">{quote.customerName || "Cliente"}</p>
            <p className="mb-3 text-xs text-white/65">
              <a href={"mailto:" + encodeURIComponent(quote.customerEmail)} className="underline underline-offset-2 hover:text-white">
                {quote.customerEmail}
              </a>
              {" · "}{new Date(quote.createdAt).toLocaleDateString("pt-BR")}
            </p>
            <ul className="space-y-2 text-sm">
              {quote.items.map((item) => (
                <li key={item.slug}>
                  <Link to={"/modelos/" + encodeURIComponent(item.slug)} className="text-[hsl(var(--gold-accent))] hover:underline">
                    {item.slug.replace(/-/g, " ")}
                  </Link> · {item.quantity} {item.quantity === 1 ? "unidade" : "unidades"}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-white/65">
              WhatsApp: {quote.whatsapp || "Não informado"} · CEP: {quote.postalCode || "Não informado"}
            </p>
            <p className="mt-1 text-xs text-white/65">
              Escala: {quote.scale || "A definir"} · Acabamento: {quote.finishing || "A definir"}
            </p>
            {quote.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-white/65">{quote.notes}</p>}
            <div className="mt-4 flex flex-wrap gap-2" aria-label={"Andamento do orçamento " + quote.id.slice(0,8)}>
              {quote.status === "pending" && (
                <button type="button" className={secondaryClass} disabled={busyId !== null}
                  onClick={() => { void updateStatus(quote.id, "reviewing"); }}>Marcar em análise</button>
              )}
              {quote.status === "reviewing" && (
                <button type="button" className={secondaryClass} disabled={busyId !== null}
                  onClick={() => { void updateStatus(quote.id, "pending"); }}>Voltar para novo</button>
              )}
              {quote.status !== "archived" && (
                <button type="button" className={secondaryClass} disabled={busyId !== null}
                  onClick={() => { void updateStatus(quote.id, "archived"); }}>Arquivar</button>
              )}
            </div>
            <div className="mt-5 border-t border-white/15 pt-4">
              {quote.status === "archived" && quote.quotedAmount === null ? (
                <p className="text-sm text-white/60">Solicitação arquivada sem valor.</p>
              ) : quote.quotedAmount !== null ? (
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
