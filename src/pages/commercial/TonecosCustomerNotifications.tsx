import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import { loadMyCatalogQuotePage } from "@/services/customer/catalog-quote-service";
import {
  loadCatalogQuoteHistory,
  type CatalogQuoteEvent,
} from "@/services/quotes/catalog-quote-history-service";
import { commercialQuoteErrorText } from "./commercial-quote-error-text";
import { customerQuoteEventLabel } from "./customer-quote-event-label";
import { panelClass, secondaryClass } from "./CommercialPage";

const PAGE_SIZE = 20;
const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

/** The notifications tab is a real read-only view over existing quote events.
 * It is not an email, push or WhatsApp delivery service.
 */
export default function TonecosCustomerNotifications({
  userId,
}: {
  userId: string;
}) {
  const [events, setEvents] = useState<CatalogQuoteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setEvents([]);
    setError("");
    setLoading(true);
    loadMyCatalogQuotePage(userId, { limit: PAGE_SIZE, offset: 0 })
      .then(async (page) => {
        const history = await loadCatalogQuoteHistory(
          page.rows.map((quote) => quote.id),
        );
        return Object.values(history)
          .flat()
          .sort(
            (left, right) =>
              Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
              right.id - left.id,
          )
          .slice(0, 30);
      })
      .then((items) => {
        if (active) setEvents(items);
      })
      .catch((failure: unknown) => {
        if (active) setError(commercialQuoteErrorText(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, attempt]);

  return (
    <section className={panelClass} aria-label="Atualizações dos orçamentos">
      <h2 className="text-lg font-semibold">Atualizações da sua conta</h2>
      <p className="mt-3 text-sm leading-6 text-white/65">
        Acompanhe os eventos registrados nas suas solicitações recentes.
        Este histórico não significa que um e-mail, SMS ou WhatsApp tenha
        sido enviado.
      </p>
      {loading && (
        <p className="mt-5 text-sm text-white/60" role="status">
          Carregando atualizações...
        </p>
      )}
      {error && (
        <div
          className="mt-5 border border-red-500/40 p-4 text-sm text-red-200"
          role="alert"
        >
          <p>{error}</p>
          {error ===
          "Sua sessão expirou. Entre novamente para continuar." ? (
            <Link
              className={secondaryClass + " mt-3"}
              to={
                TONECOS_COMMERCIAL_ROUTES.login +
                "?next=" +
                encodeURIComponent("/perfil/notificacoes")
              }
            >
              Entrar novamente
            </Link>
          ) : (
            <button
              className={secondaryClass + " mt-3"}
              type="button"
              onClick={() => setAttempt((current) => current + 1)}
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}
      {!loading && !error && events.length === 0 && (
        <p className="mt-5 text-sm text-white/60">
          Nenhuma atualização de orçamento registrada nas solicitações recentes.
        </p>
      )}
      {!loading && !error && events.length > 0 && (
        <ol className="mt-5 space-y-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="border-l-2 border-[hsl(var(--gold-accent)/0.55)] pl-4"
            >
              <p className="text-sm font-medium text-white/85">
                {customerQuoteEventLabel(event)}
              </p>
              <p className="mt-1 text-xs text-white/55">
                Orçamento #{event.quoteId.slice(0, 8)} ·{" "}
                <time dateTime={event.createdAt}>
                  {DATE_FORMAT.format(new Date(event.createdAt))}
                </time>
              </p>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-6 border-t border-white/15 pt-5">
        <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.history}>
          Consultar meus orçamentos
        </Link>
      </div>
    </section>
  );
}
