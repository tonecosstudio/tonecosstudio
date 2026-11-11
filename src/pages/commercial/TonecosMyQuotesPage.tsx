import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import { listMyCatalogQuotes, type CustomerCatalogQuote } from "@/services/customer/catalog-quote-service";
import { getTonecosCurrentUser } from "@/services/customer/tonecos-account-service";
import { CommercialPage, panelClass, secondaryClass } from "./CommercialPage";

const labels: Record<string, string> = {
  pending: "Recebido",
  reviewing: "Em análise",
  answered: "Respondido",
  archived: "Arquivado",
};
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function TonecosMyQuotesPage() {
  const location = useLocation();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [rows, setRows] = useState<CustomerCatalogQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getTonecosCurrentUser()
      .then((user) => { if (active) setUserId(user?.id ?? null); })
      .catch(() => { if (active) setUserId(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true); setError("");
    listMyCatalogQuotes(userId)
      .then((data) => { if (active) setRows(data); })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Não foi possível consultar seus orçamentos.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, attempt]);

  const justSent = Boolean(location.state && typeof location.state === "object" &&
    "sent" in location.state && typeof location.state.sent === "string");

  return (
    <CommercialPage title="Meus orçamentos" intro="Acompanhe as solicitações enviadas e os valores respondidos pela TONART Studio. Orçamento não é confirmação de compra.">
      {justSent && <p role="status" className="mb-5 max-w-3xl border border-white/20 p-4 text-sm text-white/80">Solicitação enviada. Você poderá acompanhar a resposta aqui.</p>}
      {userId === undefined || loading ? <p role="status">Carregando seus orçamentos...</p> : null}
      {userId === null ? (
        <div className={panelClass}>
          <p className="mb-4 text-sm text-white/70">Entre na sua conta para consultar suas solicitações.</p>
          <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.login + "?next=" + encodeURIComponent(TONECOS_COMMERCIAL_ROUTES.history)}>Entrar</Link>
        </div>
      ) : null}
      {error && <div role="alert" className="mb-5 max-w-3xl border border-red-500/30 p-4 text-sm text-red-200">
        <p>{error}</p>
        <button type="button" className={secondaryClass + " mt-3"} onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</button>
      </div>}
      {userId && !loading && !error && (
        rows.length === 0 ? (
          <div className={panelClass + " max-w-3xl"}>
            <p className="mb-5 text-white/70">Você ainda não enviou solicitações.</p>
            <Link className={secondaryClass} to="/modelos">Explorar modelos</Link>
          </div>
        ) : <ul className="grid max-w-3xl gap-4">
          {rows.map((row) => (
            <li key={row.id} className={panelClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Orçamento #{row.id.slice(0, 8)}</h2>
                <span className="border border-white/20 px-3 py-1 text-xs">{labels[row.status] ?? "Em atualização"}</span>
              </div>
              <p className="mt-2 text-xs text-white/55">
                Solicitado em {new Date(row.createdAt).toLocaleDateString("pt-BR")}
              </p>
              <ul className="mt-4 space-y-1 text-sm text-white/70">
                {row.items.map((item) => (
                  <li key={item.slug}>
                    <Link to={"/modelos/" + encodeURIComponent(item.slug)} className="underline-offset-2 hover:underline">
                      {item.slug.replace(/-/g, " ")}
                    </Link> · {item.quantity} {item.quantity === 1 ? "unidade" : "unidades"}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-white/60">
                Escala: {row.scale || "A definir"} · Acabamento: {row.finishing || "A definir"}
              </p>
              {row.notes && <p className="mt-4 whitespace-pre-wrap text-sm text-white/60">{row.notes}</p>}
              <div className="mt-5 border-t border-white/15 pt-4 text-sm font-semibold">
                {row.quotedAmount === null ? "Valor em análise" : brl.format(row.quotedAmount)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </CommercialPage>
  );
}
