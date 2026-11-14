import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import {
  loadMyCatalogQuotePage,
  type CustomerCatalogQuote,
} from "@/services/customer/catalog-quote-service";
import { getTonecosCurrentUser } from "@/services/customer/tonecos-account-service";
import {
  loadCatalogQuoteHistory,
  type CatalogQuoteEvent,
} from "@/services/quotes/catalog-quote-history-service";
import { CommercialPage, panelClass, secondaryClass } from "./CommercialPage";
import { commercialQuoteErrorText } from "./commercial-quote-error-text";
import { customerQuoteEventLabel } from "./customer-quote-event-label";

const labels: Record<string, string> = {
  pending: "Recebido",
  reviewing: "Em análise",
  answered: "Respondido",
  archived: "Arquivado",
};
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const eventDate = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const PAGE_SIZE = 20;

export default function TonecosMyQuotesPage() {
  const location = useLocation();
  const requestedId = new URLSearchParams(location.search).get("quote");
  const selectedId =
    requestedId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedId)
      ? requestedId.toLowerCase()
      : null;
  const invalidSelection = requestedId !== null && !selectedId;
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [authError, setAuthError] = useState(false);
  const [authAttempt, setAuthAttempt] = useState(0);
  const [rows, setRows] = useState<CustomerCatalogQuote[]>([]);
  const [history, setHistory] = useState<Record<string, CatalogQuoteEvent[]>>(
    {},
  );
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setUserId(undefined);
    setAuthError(false);
    getTonecosCurrentUser()
      .then((user) => {
        if (active) setUserId(user?.id ?? null);
      })
      .catch(() => {
        if (active) {
          setAuthError(true);
          setUserId(null);
        }
      });
    return () => {
      active = false;
    };
  }, [authAttempt]);

  useEffect(() => {
    if (!userId || invalidSelection) return;
    let active = true;
    setRows([]);
    setHistory({});
    setLoading(true);
    setError("");
    loadMyCatalogQuotePage(
      userId,
      selectedId
        ? { limit: 1, offset: 0, quoteId: selectedId }
        : { limit: PAGE_SIZE, offset },
    )
      .then(async (result) => ({
        result,
        history: await loadCatalogQuoteHistory(
          result.rows.map((quote) => quote.id),
        ),
      }))
      .then(({ result, history: quoteHistory }) => {
        if (!active) return;
        if (!selectedId && result.total > 0 && offset >= result.total) {
          setOffset(Math.floor((result.total - 1) / PAGE_SIZE) * PAGE_SIZE);
          return;
        }
        setRows(result.rows);
        setTotal(result.total);
        setHistory(quoteHistory);
      })
      .catch((err: unknown) => {
        if (active) setError(commercialQuoteErrorText(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, attempt, offset, selectedId, invalidSelection]);

  // Navigation state is not proof until the authenticated quote directory returns it.
  const sentId =
    location.state &&
    typeof location.state === "object" &&
    "sent" in location.state &&
    typeof location.state.sent === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      location.state.sent,
    )
      ? location.state.sent
      : null;
  const justSent = Boolean(
    sentId &&
    userId &&
    !loading &&
    !error &&
    rows.some((row) => row.id === sentId),
  );

  return (
    <CommercialPage
      title="Meus orçamentos"
      intro="Acompanhe as solicitações enviadas e os valores respondidos pela TONART Studio. Orçamento não é confirmação de compra."
    >
      {invalidSelection && (
        <p role="alert" className="mb-5 max-w-3xl border border-white/20 p-4 text-sm text-white/75">
          O link do orçamento é inválido. Abra seu histórico para continuar.
        </p>
      )}
      {selectedId && (
        <div className="mb-5 max-w-3xl flex flex-wrap items-center gap-3">
          <p className="text-sm text-white/75">
            Consultando orçamento #{selectedId.slice(0, 8)}
          </p>
          <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.history}>
            Ver todos os orçamentos
          </Link>
        </div>
      )}
      {justSent && (
        <p
          role="status"
          className="mb-5 max-w-3xl border border-white/20 p-4 text-sm text-white/80"
        >
          Solicitação enviada. Você poderá acompanhar a resposta aqui.
        </p>
      )}
      {userId === undefined || (loading && !invalidSelection) ? (
        <p role="status">Carregando seus orçamentos...</p>
      ) : null}
      {authError ? (
        <div role="alert" className={panelClass}>
          <p className="mb-4 text-sm text-white/70">
            Não foi possível verificar sua sessão.
          </p>
          <button
            type="button"
            className={secondaryClass}
            onClick={() => setAuthAttempt((n) => n + 1)}
          >
            Tentar novamente
          </button>
        </div>
      ) : userId === null ? (
        <div className={panelClass}>
          <p className="mb-4 text-sm text-white/70">
            Entre na sua conta para consultar suas solicitações.
          </p>
          <Link
            className={secondaryClass}
            to={
              TONECOS_COMMERCIAL_ROUTES.login +
              "?next=" +
              encodeURIComponent(
                selectedId
                  ? TONECOS_COMMERCIAL_ROUTES.history + "?quote=" + selectedId
                  : TONECOS_COMMERCIAL_ROUTES.history,
              )
            }
          >
            Entrar
          </Link>
        </div>
      ) : null}
      {error && (
        <div
          role="alert"
          className="mb-5 max-w-3xl border border-red-500/30 p-4 text-sm text-red-200"
        >
          <p>{error}</p>
          {error === "Sua sessão expirou. Entre novamente para continuar." ? (
            <Link
              className={secondaryClass + " mt-3"}
              to={
                TONECOS_COMMERCIAL_ROUTES.login +
                "?next=" +
                encodeURIComponent(
                selectedId
                  ? TONECOS_COMMERCIAL_ROUTES.history + "?quote=" + selectedId
                  : TONECOS_COMMERCIAL_ROUTES.history,
              )
              }
            >
              Entrar novamente
            </Link>
          ) : (
            <button
              type="button"
              className={secondaryClass + " mt-3"}
              onClick={() => setAttempt((n) => n + 1)}
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}
      {userId && !authError && !error && !invalidSelection && (
        <div className="mb-5">
          <button
            type="button"
            className={secondaryClass}
            disabled={loading}
            onClick={() => setAttempt((current) => current + 1)}
          >
            {loading ? "Atualizando..." : "Atualizar orçamentos"}
          </button>
        </div>
      )}
      {userId && !loading && !error && !invalidSelection && !selectedId && total > 0 && (
        <p className="mb-4 max-w-3xl text-xs text-white/55">
          Mostrando {offset + 1}–{Math.min(offset + rows.length, total)} de{" "}
          {total}
        </p>
      )}
      {userId &&
        !loading &&
        !error &&
        !invalidSelection &&
        (rows.length === 0 ? (
          <div className={panelClass + " max-w-3xl"}>
            <p className="mb-5 text-white/70">
              {selectedId
                ? "Esse orçamento não foi encontrado na sua conta."
                : "Você ainda não enviou solicitações."}
            </p>
            <Link className={secondaryClass} to="/modelos">
              Explorar modelos
            </Link>
          </div>
        ) : (
          <ul className="grid max-w-3xl gap-4">
            {rows.map((row) => (
              <li key={row.id} className={panelClass}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-semibold">
                    Orçamento #{row.id.slice(0, 8)}
                  </h2>
                  <span className="border border-white/20 px-3 py-1 text-xs">
                    {labels[row.status] ?? "Em atualização"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/55">
                  Solicitado em{" "}
                  {new Date(row.createdAt).toLocaleDateString("pt-BR")}
                </p>
                <ul className="mt-4 space-y-1 text-sm text-white/70">
                  {row.items.map((item) => (
                    <li key={item.slug}>
                      <Link
                        to={"/modelos/" + encodeURIComponent(item.slug)}
                        className="underline-offset-2 hover:underline"
                      >
                        {item.slug.replace(/-/g, " ")}
                      </Link>{" "}
                      · {item.quantity}{" "}
                      {item.quantity === 1 ? "unidade" : "unidades"}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-white/60">
                  Escala: {row.scale || "A definir"} · Acabamento:{" "}
                  {row.finishing || "A definir"}
                </p>
                {row.notes && (
                  <p className="mt-4 whitespace-pre-wrap text-sm text-white/60">
                    {row.notes}
                  </p>
                )}
                {row.responseMessage && (
                  <section className="mt-5 border-l-2 border-[hsl(var(--gold-accent)/0.55)] pl-4">
                    <h3 className="text-sm font-semibold">
                      Resposta da TONART
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">
                      {row.responseMessage}
                    </p>
                  </section>
                )}
                {(history[row.id] ?? []).length > 0 && (
                  <section className="mt-5 border-t border-white/15 pt-4">
                    <h3 className="text-sm font-semibold">Andamento</h3>
                    <ol className="mt-3 space-y-2">
                      {(history[row.id] ?? []).map((event) => (
                        <li key={event.id} className="text-xs text-white/65">
                          <span className="text-white/85">
                            {customerQuoteEventLabel(event)}
                          </span>
                          {" · "}
                          <time dateTime={event.createdAt}>
                            {eventDate.format(new Date(event.createdAt))}
                          </time>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
                <div className="mt-5 border-t border-white/15 pt-4 text-sm font-semibold">
                  {row.quotedAmount === null
                    ? "Valor em análise"
                    : brl.format(row.quotedAmount)}
                </div>
              </li>
            ))}
          </ul>
        ))}
      {userId && !loading && !error && !selectedId && !invalidSelection && total > PAGE_SIZE && (
        <div className="mt-6 flex max-w-3xl items-center justify-between gap-3">
          <button
            type="button"
            className={secondaryClass}
            disabled={offset === 0}
            onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
          >
            Anterior
          </button>
          <span className="text-xs text-white/55">
            Página {Math.floor(offset / PAGE_SIZE) + 1} de{" "}
            {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button
            type="button"
            className={secondaryClass}
            disabled={offset + rows.length >= total}
            onClick={() => setOffset((value) => value + PAGE_SIZE)}
          >
            Próxima
          </button>
        </div>
      )}
    </CommercialPage>
  );
}
