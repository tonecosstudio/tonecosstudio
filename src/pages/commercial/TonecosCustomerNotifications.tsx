import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "@/services/customer/notification-preferences-service";
import { loadMyCatalogQuotePage } from "@/services/customer/catalog-quote-service";
import {
  loadCatalogQuoteHistory,
  type CatalogQuoteEvent,
} from "@/services/quotes/catalog-quote-history-service";
import { NotificationsSection } from "../ProfileSections";
import { commercialQuoteErrorText } from "./commercial-quote-error-text";
import { customerQuoteEventLabel } from "./customer-quote-event-label";
import { panelClass, secondaryClass } from "./CommercialPage";

const PAGE_SIZE = 20;
const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

/** Keeps send preferences and recorded quote events in the customer's account. */
export default function TonecosCustomerNotifications({
  userId,
}: {
  userId: string;
}) {
  const [events, setEvents] = useState<CatalogQuoteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [preferencesAttempt, setPreferencesAttempt] = useState(0);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesLoadError, setPreferencesLoadError] = useState("");
  const [preferencesSaveError, setPreferencesSaveError] = useState("");
  const [preferencesNotice, setPreferencesNotice] = useState("");
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(true);

  useEffect(() => {
    let active = true;
    setPreferencesLoading(true);
    setPreferencesLoadError("");
    fetchNotificationPreferences()
      .then((preferences) => {
        if (!active) return;
        setEmailNotifications(
          preferences.item_shipped && preferences.item_delivered,
        );
        setOrderUpdates(preferences.production_stage_updates);
        setMarketingEmails(preferences.marketing_emails);
      })
      .catch(() => {
        if (active) {
          setPreferencesLoadError(
            "Não foi possível carregar as preferências de envio.",
          );
        }
      })
      .finally(() => {
        if (active) setPreferencesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, preferencesAttempt]);

  async function savePreferences() {
    if (savingPreferences || preferencesLoading || preferencesLoadError) return;
    setSavingPreferences(true);
    setPreferencesSaveError("");
    setPreferencesNotice("");
    try {
      const saved = await updateNotificationPreferences({
        production_stage_updates: orderUpdates,
        item_shipped: emailNotifications,
        item_delivered: emailNotifications,
        marketing_emails: marketingEmails,
      });
      setEmailNotifications(saved.item_shipped && saved.item_delivered);
      setOrderUpdates(saved.production_stage_updates);
      setMarketingEmails(saved.marketing_emails);
      setPreferencesNotice("Preferências de envio salvas na sua conta.");
    } catch {
      setPreferencesSaveError(
        "Não foi possível salvar as preferências. Tente novamente.",
      );
    } finally {
      setSavingPreferences(false);
    }
  }

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
    <div className="space-y-6">
      <section className={panelClass} aria-label="Preferências de envio">
        <h2 className="text-lg font-semibold">Preferências de envio</h2>
        <p className="mt-3 text-sm leading-6 text-white/65">
          Controle quais avisos operacionais e comerciais podem ser enviados
          pelos canais já configurados na conta.
        </p>
        {preferencesLoadError && (
          <div role="alert" className="mt-4 space-y-3 text-sm text-red-200">
            <p>{preferencesLoadError}</p>
            <button
              className={secondaryClass}
              type="button"
              onClick={() =>
                setPreferencesAttempt((current) => current + 1)
              }
            >
              Tentar carregar novamente
            </button>
          </div>
        )}
        {preferencesSaveError && (
          <p role="alert" className="mt-4 text-sm text-red-200">
            {preferencesSaveError}
          </p>
        )}
        {preferencesNotice && (
          <p role="status" className="mt-4 text-sm text-emerald-200">
            {preferencesNotice}
          </p>
        )}
        {preferencesLoading && (
          <p role="status" className="mt-4 text-sm text-white/60">
            Carregando preferências de envio...
          </p>
        )}
        {!preferencesLoading && !preferencesLoadError && (
          <NotificationsSection
            emailNotifications={emailNotifications}
            setEmailNotifications={setEmailNotifications}
            orderUpdates={orderUpdates}
            setOrderUpdates={setOrderUpdates}
            marketingEmails={marketingEmails}
            setMarketingEmails={setMarketingEmails}
            saveMutation={{
              mutate: () => void savePreferences(),
              isPending: savingPreferences,
            }}
          />
        )}
      </section>

      <section className={panelClass} aria-label="Atualizações dos orçamentos">
        <h2 className="text-lg font-semibold">Atualizações da sua conta</h2>
        <p className="mt-3 text-sm leading-6 text-white/65">
          Acompanhe os eventos registrados nas suas solicitações recentes.
          Este histórico mostra o que foi registrado na conta; ele não confirma
          o envio de e-mail, SMS ou WhatsApp.
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
                  <Link
                    className="text-[hsl(var(--gold-accent))] underline-offset-4 hover:underline"
                    to={
                      TONECOS_COMMERCIAL_ROUTES.history +
                      "?quote=" +
                      encodeURIComponent(event.quoteId)
                    }
                  >
                    Orçamento #{event.quoteId.slice(0, 8)}
                  </Link>{" · "}
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
    </div>
  );
}
