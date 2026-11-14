import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { profileNavigationConfig } from "@/config/profile-navigation.config";
import {
  PUBLIC_SUBSCRIPTIONS_ENABLED,
  TONECOS_COMMERCIAL_ROUTES,
} from "@/config/routes";
import {
  getMyTonecosProfile,
  getTonecosCurrentUser,
  updateMyTonecosPersonalData,
  updateMyTonecosDeliveryAddress,
  updateMyTonecosContactPreferences,
  type TonecosDeliveryAddress,
  type TonecosContactPreferences,
} from "@/services/customer/tonecos-account-service";
import { useCatalogBrowsing } from "@/services/catalog/catalog-browsing-context";
import { loadMyCatalogQuotePage } from "@/services/customer/catalog-quote-service";
import TonecosCustomerActivity from "./TonecosCustomerActivity";
import TonecosCustomerNotifications from "./TonecosCustomerNotifications";
import TonecosCustomerContactSummary from "./TonecosCustomerContactSummary";
import {
  actionClass,
  CommercialPage,
  fieldClass,
  panelClass,
  secondaryClass,
} from "./CommercialPage";
import { SubscriptionSection } from "../ProfileSections";
import { TonecosSubscriptionUnavailablePanel } from "./TonecosSubscriptionUnavailable";

type CustomerSection = {
  slug: string;
  label: string;
  title: string;
  summary: string;
};

const restoredSections: CustomerSection[] = [
  {
    slug: "dados-pessoais",
    label: "Dados pessoais",
    title: "Dados pessoais",
    summary: "Gerencie seus dados pessoais e contatos em um único perfil.",
  },
  {
    slug: "endereco",
    label: "Endereços",
    title: "Endereços e entrega",
    summary: "Dados de localização para futuras entregas e cálculo de frete.",
  },
  {
    slug: "pedidos",
    label: "Pedidos",
    title: "Pedidos e orçamentos",
    summary: "Solicitações, aprovações e acompanhamento de encomendas.",
  },
  {
    slug: "producao",
    label: "Produção",
    title: "Acompanhamento de produção",
    summary: "Acompanhe as etapas das peças quando houver pedidos efetivados.",
  },
  {
    slug: "colecao",
    label: "Minha coleção",
    title: "Minha coleção",
    summary: "Modelos selecionados e peças de sua coleção.",
  },
  {
    slug: "preferencias",
    label: "Preferências",
    title: "Preferências",
    summary: "Preferências de contato e informações da experiência de cliente.",
  },
  {
    slug: "assinatura",
    label: "Assinaturas",
    title: "Assinaturas",
    summary: "Informações sobre planos e continuidade do relacionamento.",
  },
];

const restoredPaths = restoredSections.map((section) => ({
  ...section,
  path: TONECOS_COMMERCIAL_ROUTES.account + "/" + section.slug,
}));

/**
 * Reuses the legacy profile navigation as the source for existing categories.
 * Restored pages are additional views of the same customer account, never another identity.
 */
const previousSections = profileNavigationConfig.flatMap((group) =>
  group.subSections.map((section) => ({
    path:
      section.id === "info" ? TONECOS_COMMERCIAL_ROUTES.account : section.path,
    label: section.label,
  })),
);

export function getCustomerNavigationLinks<T extends { path: string }>(
  links: readonly T[],
  subscriptionsEnabled: boolean,
  accountPath: string,
): T[] {
  const legacySubscriptionPath = accountPath + "/assinatura";
  const canonicalSubscriptionPath = accountPath + "/assinaturas";
  const hasCanonicalSubscriptionPath = links.some(
    (item) => item.path === canonicalSubscriptionPath,
  );

  return links.filter(
    (item) =>
      !subscriptionsEnabled ||
      !hasCanonicalSubscriptionPath ||
      item.path !== legacySubscriptionPath,
  );
}

/** Keep one canonical destination per section even when the old profile registry
 * and the restored navigation expose the same path.
 */
const uniqueCustomerSectionLinks = [
  ...new Map(
    [
      ...previousSections,
      ...restoredPaths.map(({ path, label }) => ({ path, label })),
    ].map((item) => [item.path, item] as const),
  ).values(),
];
export const customerSectionLinks = getCustomerNavigationLinks(
  uniqueCustomerSectionLinks,
  PUBLIC_SUBSCRIPTIONS_ENABLED,
  TONECOS_COMMERCIAL_ROUTES.account,
);

export function TonecosCustomerNavigation({
  layout = "inline",
}: {
  layout?: "inline" | "sidebar";
} = {}) {
  const location = useLocation();
  const accountLinks = customerSectionLinks.filter((item) =>
    [
      "/perfil",
      "/perfil/dados-pessoais",
      "/perfil/endereco",
      "/perfil/preferencias",
    ].includes(item.path),
  );
  const commercialLinks = customerSectionLinks.filter((item) =>
    [
      "/perfil/pedidos",
      "/perfil/producao",
      "/perfil/colecao",
      "/perfil/pagamentos",
      "/perfil/assinatura",
      "/perfil/assinaturas",
    ].includes(item.path),
  );
  const communicationLinks = customerSectionLinks.filter((item) =>
    ["/perfil/notificacoes", "/perfil/suporte"].includes(item.path),
  );
  const sections = [
    { title: "Cadastro e preferências", items: accountLinks },
    { title: "Solicitações e relacionamento", items: commercialLinks },
    { title: "Comunicação", items: communicationLinks },
  ];
  return (
    <nav
      aria-label="Seções da Minha Conta"
      className={layout === "sidebar" ? "space-y-5" : "mb-6 space-y-5"}
    >
      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            {section.title}
          </h2>
          <div
            className={
              layout === "sidebar"
                ? "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1"
                : "flex flex-wrap gap-2"
            }
          >
            {section.items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                aria-current={
                  location.pathname === item.path ? "page" : undefined
                }
                className={
                  (layout === "sidebar"
                    ? "flex min-h-11 w-full items-center rounded-sm border px-3 py-2 text-sm transition-colors "
                    : "inline-flex min-h-10 items-center rounded-sm border px-3 py-2 text-xs transition-colors ") +
                  (location.pathname === item.path
                    ? "border-[hsl(var(--gold-accent))] text-[hsl(var(--gold-accent))]"
                    : "border-white/20 text-white/70 hover:border-white/50 hover:text-white")
                }
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** Consistent customer shell shared by account overview and restored sections. */
export function TonecosCustomerWorkspace({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
      <aside
        className={panelClass + " lg:sticky lg:top-24"}
        aria-label="Navegação lateral da conta"
      >
        <TonecosCustomerNavigation layout="sidebar" />
      </aside>
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  );
}

const BLANK_DELIVERY_ADDRESS: TonecosDeliveryAddress = {
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  country: "BR",
};
const BLANK_PREFERENCES: TonecosContactPreferences = {
  preferredContactChannel: null,
  quoteUpdates: false,
};
const ADDRESS_FIELDS = [
  {
    key: "zipCode",
    label: "CEP",
    autoComplete: "postal-code",
    maxLength: 9,
    placeholder: "00000-000",
  },
  {
    key: "street",
    label: "Rua",
    autoComplete: "address-line1",
    maxLength: 160,
  },
  { key: "number", label: "Número", autoComplete: "off", maxLength: 20 },
  {
    key: "complement",
    label: "Complemento",
    autoComplete: "address-line2",
    maxLength: 160,
  },
  {
    key: "neighborhood",
    label: "Bairro",
    autoComplete: "address-level3",
    maxLength: 100,
  },
  {
    key: "city",
    label: "Cidade",
    autoComplete: "address-level2",
    maxLength: 100,
  },
] as const;

function formatCpfInput(value: string | null): string {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 11);
  if (digits.length > 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length > 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  if (digits.length > 3) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  return digits;
}

function todayDateInputValue(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

type ComplementarySection = "dados-pessoais" | "endereco" | "preferencias";

/**
 * One customer editor over the existing Auth-owned public.profiles.
 * Never persists quote-level contact data, session storage or a second profile.
 */
function CustomerComplementaryEditor({
  section,
}: {
  section: ComplementarySection;
}) {
  const [profile, setProfile] = useState<Awaited<
    ReturnType<typeof getMyTonecosProfile>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState<TonecosDeliveryAddress>(
    BLANK_DELIVERY_ADDRESS,
  );
  const [preferences, setPreferences] =
    useState<TonecosContactPreferences>(BLANK_PREFERENCES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    setError("");
    setNotice("");
    getMyTonecosProfile()
      .then((value) => {
        if (!active) return;
        setProfile(value);
        setWhatsapp(value.whatsapp ?? "");
        setCpf(formatCpfInput(value.cpf));
        setBirthDate(value.birth_date ?? "");
        const saved = value.delivery_address;
        const object =
          saved !== null && typeof saved === "object" && !Array.isArray(saved)
            ? (saved as Record<string, unknown>)
            : {};
        const fromSaved = (key: keyof TonecosDeliveryAddress) =>
          typeof object[key] === "string" ? (object[key] as string) : "";
        setAddress({
          zipCode: fromSaved("zipCode"),
          street: fromSaved("street"),
          number: fromSaved("number"),
          complement: fromSaved("complement"),
          neighborhood: fromSaved("neighborhood"),
          city: fromSaved("city"),
          state: fromSaved("state"),
          country: "BR",
        });
        setPreferences({
          preferredContactChannel:
            value.preferred_contact_channel === "email" ||
            value.preferred_contact_channel === "whatsapp" ||
            value.preferred_contact_channel === "phone"
              ? value.preferred_contact_channel
              : null,
          quoteUpdates: value.quote_updates === true,
        });
      })
      .catch(() => {
        if (active) {
          setProfile(null);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [section, attempt]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !profile) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated =
        section === "dados-pessoais"
          ? await updateMyTonecosPersonalData({ whatsapp, cpf, birthDate })
          : section === "endereco"
            ? await updateMyTonecosDeliveryAddress(address)
            : await updateMyTonecosContactPreferences(preferences);
      setProfile(updated);
      setNotice("Informações salvas na sua conta.");
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : "";
      setError(
        message === "tonecos_account_cpf_invalid"
          ? "Confira o CPF informado e os dígitos verificadores."
          : message === "tonecos_account_birth_date_invalid"
            ? "Informe uma data de nascimento válida."
            : message === "tonecos_account_tax_details_unavailable"
              ? "Os campos de CPF e nascimento ainda não estão habilitados neste ambiente. Nenhuma alteração foi salva; atualize a página após a configuração do cadastro."
              : "Não foi possível salvar. Confira os campos e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function clearAddress() {
    if (busy || !profile) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateMyTonecosDeliveryAddress(null);
      setProfile(updated);
      setAddress(BLANK_DELIVERY_ADDRESS);
      setNotice("Endereço removido da sua conta.");
    } catch {
      setError("Não foi possível remover o endereço. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p role="status">Carregando seus dados cadastrados...</p>;
  }
  if (loadError || !profile) {
    return (
      <div role="alert" className={panelClass}>
        <p className="mb-3 text-sm text-white/75">
          Não foi possível consultar seus dados cadastrais. Nenhuma informação
          foi alterada.
        </p>
        <button
          type="button"
          className={secondaryClass}
          onClick={() => setAttempt((current) => current + 1)}
        >
          Tentar carregar dados
        </button>
      </div>
    );
  }

  const isPersonal = section === "dados-pessoais";
  const isAddress = section === "endereco";
  const taxDetailsAvailable = profile.taxDetailsAvailable !== false;
  return (
    <div className="space-y-6">
      {isPersonal && (
        <TonecosCustomerContactSummary profile={profile} variant="account" />
      )}
      <section
        className={panelClass}
        aria-label={
          isPersonal
            ? "Dados pessoais e de contato"
            : isAddress
              ? "Cadastro de entrega"
              : "Preferências do cliente"
        }
      >
        <h2 className="mb-2 text-lg font-semibold">
          {isPersonal
            ? "Dados pessoais e contato"
            : isAddress
              ? "Cadastro de entrega"
              : "Preferências do cliente"}
        </h2>
        <p className="mb-5 text-sm leading-6 text-white/60">
          {isPersonal
            ? "Informe seu WhatsApp, CPF e data de nascimento. CPF e nascimento são opcionais; o CPF só é necessário quando houver emissão fiscal."
            : isAddress
              ? "Este endereço pertence à sua conta. O CEP de um orçamento anterior não é considerado endereço cadastrado."
              : "Defina seu canal preferido e os avisos de orçamento. As preferências de envio de e-mails sobre produção, entrega e campanhas ficam em Notificações."}
        </p>
        {isPersonal && profile.taxDetailsAvailable === false && (
          <p
            role="status"
            className="mb-4 border border-amber-400/30 bg-amber-400/[0.06] p-3 text-sm leading-6 text-amber-100/80"
          >
            WhatsApp e os demais dados da conta continuam disponíveis. O
            cadastro conectado ainda não aceita CPF e data de nascimento, então
            esses campos não serão salvos até a atualização do schema.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mb-4 border border-red-500/40 p-3 text-sm text-red-200"
          >
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mb-4 border border-white/20 p-3 text-sm">
            {notice}
          </p>
        )}
        <form
          onSubmit={(event) => {
            void save(event);
          }}
          className="space-y-5"
        >
          {isPersonal && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-sm">
                <span>WhatsApp</span>
                <input
                  className={fieldClass}
                  type="tel"
                  autoComplete="tel"
                  aria-label="WhatsApp"
                  maxLength={40}
                  placeholder="(71) 99999-9999"
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                />
                <span className="block text-xs text-white/50">
                  Opcional. Para alterar o telefone principal, abra Dados da
                  conta.
                </span>
              </label>
              <label className="block space-y-2 text-sm">
                <span>CPF</span>
                <input
                  className={fieldClass}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label="CPF"
                  disabled={!taxDetailsAvailable}
                  maxLength={14}
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(event) =>
                    setCpf(formatCpfInput(event.target.value))
                  }
                />
                <span className="block text-xs text-white/50">
                  Opcional. Informe apenas quando necessário para emissão
                  fiscal.
                </span>
              </label>
              <label className="block space-y-2 text-sm">
                <span>Data de nascimento</span>
                <input
                  className={fieldClass}
                  type="date"
                  autoComplete="bday"
                  max={todayDateInputValue()}
                  aria-label="Data de nascimento"
                  disabled={!taxDetailsAvailable}
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                />
                <span className="block text-xs text-white/50">Opcional.</span>
              </label>
            </div>
          )}
          {isAddress && (
            <div className="grid gap-4 sm:grid-cols-2">
              {ADDRESS_FIELDS.map((field) => (
                <label className="block space-y-2 text-sm" key={field.key}>
                  <span>{field.label}</span>
                  <input
                    className={fieldClass}
                    type="text"
                    aria-label={field.label}
                    required={field.key !== "complement"}
                    maxLength={field.maxLength}
                    placeholder={
                      "placeholder" in field ? field.placeholder : undefined
                    }
                    autoComplete={field.autoComplete}
                    inputMode={field.key === "zipCode" ? "numeric" : undefined}
                    value={address[field.key] ?? ""}
                    onChange={(event) =>
                      setAddress((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}
              <label className="block space-y-2 text-sm">
                <span>UF</span>
                <select
                  className={fieldClass}
                  required
                  aria-label="UF"
                  autoComplete="address-level1"
                  value={address.state}
                  onChange={(event) =>
                    setAddress((current) => ({
                      ...current,
                      state: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecione</option>
                  {[
                    "AC",
                    "AL",
                    "AP",
                    "AM",
                    "BA",
                    "CE",
                    "DF",
                    "ES",
                    "GO",
                    "MA",
                    "MT",
                    "MS",
                    "MG",
                    "PA",
                    "PB",
                    "PR",
                    "PE",
                    "PI",
                    "RJ",
                    "RN",
                    "RS",
                    "RO",
                    "RR",
                    "SC",
                    "SP",
                    "SE",
                    "TO",
                  ].map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {!isPersonal && !isAddress && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-sm">
                <span>Canal preferido de contato</span>
                <select
                  className={fieldClass}
                  aria-label="Canal preferido de contato"
                  value={preferences.preferredContactChannel ?? ""}
                  onChange={(event) =>
                    setPreferences((current) => ({
                      ...current,
                      preferredContactChannel:
                        event.target.value === "email" ||
                        event.target.value === "whatsapp" ||
                        event.target.value === "phone"
                          ? event.target.value
                          : null,
                    }))
                  }
                >
                  <option value="">Não definido</option>
                  <option value="email">E-mail</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Telefone</option>
                </select>
              </label>
              {(
                [["quoteUpdates", "Avisos sobre orçamentos"]] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-3 border border-white/15 p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[hsl(var(--gold-accent))]"
                    aria-label={label}
                    checked={preferences[key]}
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
              <Link
                className={secondaryClass + " min-h-11 self-end"}
                to={TONECOS_COMMERCIAL_ROUTES.account + "/notificacoes"}
              >
                Gerenciar preferências de envio
              </Link>
            </div>
          )}
          <div className="flex flex-wrap gap-3 border-t border-white/15 pt-4">
            <button className={actionClass} type="submit" disabled={busy}>
              {busy
                ? "Salvando..."
                : isPersonal
                  ? "Salvar dados pessoais"
                  : isAddress
                    ? "Salvar endereço"
                    : "Salvar preferências"}
            </button>
            {isAddress && profile.delivery_address && (
              <button
                type="button"
                className={secondaryClass}
                disabled={busy}
                onClick={() => {
                  void clearAddress();
                }}
              >
                Remover endereço
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

const quotePaymentCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function quotePaymentStatusLabel(status: string | null): string {
  switch (status) {
    case "pending":
      return "Aguardando comprovante";
    case "under_review":
      return "Comprovante em análise";
    case "deposit_paid":
      return "Entrada aprovada";
    case "fully_paid":
      return "Pagamento concluído";
    case "rejected":
      return "Comprovante recusado";
    default:
      return "Aguardando instruções de pagamento";
  }
}

/** Uses the TONART quote/payment record; the legacy card-method tables are not part of this schema. */
function CustomerQuotePayments({ userId }: { userId: string }) {
  const [page, setPage] = useState<Awaited<
    ReturnType<typeof loadMyCatalogQuotePage>
  > | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setPage(null);
    setStatus("loading");
    loadMyCatalogQuotePage(userId, { limit: 10, offset: 0 })
      .then((result) => {
        if (!active) return;
        setPage(result);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [userId, attempt]);

  const paymentQuotes = (page?.rows ?? []).filter(
    (quote) =>
      quote.quotedAmount !== null ||
      quote.paymentStatus !== null ||
      quote.paymentLinkSentAt !== null ||
      quote.paymentVoucherPath !== null ||
      quote.coinAmountApplied > 0,
  );

  return (
    <section className={panelClass} aria-label="Pagamentos dos orçamentos">
      <h2 className="mb-2 text-lg font-semibold">
        Pagamentos dos seus orçamentos
      </h2>
      <p className="mb-5 text-sm leading-6 text-white/60">
        Valores, instruções PIX, comprovantes e aprovações ficam vinculados ao
        orçamento correspondente. Abra o registro para consultar os detalhes
        atualizados.
      </p>
      {status === "loading" && (
        <p role="status">Consultando pagamentos recentes...</p>
      )}
      {status === "error" && (
        <div role="alert" className="space-y-3">
          <p className="text-sm text-white/75">
            Não foi possível consultar seus pagamentos. Nenhuma informação foi
            alterada.
          </p>
          <button
            type="button"
            className={secondaryClass}
            onClick={() => setAttempt((value) => value + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {status === "ready" && paymentQuotes.length === 0 && (
        <p className="text-sm text-white/65">
          Nenhum orçamento recente tem valor ou pagamento registrado.
        </p>
      )}
      {status === "ready" && paymentQuotes.length > 0 && (
        <ul className="space-y-3">
          {paymentQuotes.map((quote) => (
            <li
              key={quote.id}
              className="flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {quote.isPreorder ? "Pré-venda" : "Orçamento"} #
                  {quote.id.slice(0, 8)}
                </p>
                <p className="mt-1 text-xs text-white/55">
                  {quotePaymentStatusLabel(quote.paymentStatus)}
                  {quote.quotedAmount !== null
                    ? ` · ${quotePaymentCurrency.format(quote.quotedAmount)}`
                    : ""}
                </p>
                {quote.coinAmountApplied > 0 && (
                  <p className="mt-1 text-xs text-white/50">
                    {quote.coinAmountApplied} Coins aplicados ao orçamento
                  </p>
                )}
              </div>
              <Link
                className={secondaryClass}
                to={
                  TONECOS_COMMERCIAL_ROUTES.history +
                  "?quote=" +
                  encodeURIComponent(quote.id)
                }
              >
                Ver pagamento
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        className={secondaryClass + " mt-5"}
        to={TONECOS_COMMERCIAL_ROUTES.history}
      >
        Abrir meus orçamentos
      </Link>
    </section>
  );
}

type QuoteContextSection = "dados-pessoais" | "endereco" | "preferencias";

/** Displays quote-specific information already stored in the canonical quote history.
 * This does not turn a past request into permanent account profile data.
 */
function RecentQuoteContext({
  userId,
  section,
}: {
  userId: string;
  section: QuoteContextSection;
}) {
  const [page, setPage] = useState<Awaited<
    ReturnType<typeof loadMyCatalogQuotePage>
  > | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setPage(null);
    setStatus("loading");
    loadMyCatalogQuotePage(userId, { limit: 5, offset: 0 })
      .then((result) => {
        if (!active) return;
        setPage(result);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [userId, attempt]);

  const quote = page?.rows.find((item) => {
    if (section === "dados-pessoais") return Boolean(item.whatsapp?.trim());
    if (section === "endereco") return Boolean(item.postalCode?.trim());
    return (
      (item.scale && item.scale !== "a definir") ||
      (item.finishing && item.finishing !== "a definir")
    );
  });
  return (
    <section
      className={panelClass}
      aria-label="Informações de orçamentos anteriores"
    >
      <h2 className="mb-2 text-lg font-semibold">
        Informações de orçamentos anteriores
      </h2>
      <p className="mb-4 text-sm leading-6 text-white/60">
        Estes dados pertencem às solicitações enviadas, não ao cadastro
        permanente da Minha Conta. Não são reaproveitados automaticamente em
        novos orçamentos.
      </p>
      {status === "loading" && (
        <p role="status" className="text-sm text-white/60">
          Consultando solicitações recentes...
        </p>
      )}
      {status === "error" && (
        <div role="alert" className="space-y-3">
          <p className="text-sm text-white/75">
            Não foi possível consultar as informações anteriores. Nenhum dado
            cadastral foi alterado.
          </p>
          <button
            type="button"
            className={secondaryClass}
            onClick={() => setAttempt((value) => value + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {status === "ready" && (
        <>
          {quote ? (
            <div className="space-y-3">
              <p className="text-xs text-white/50">
                Informado no orçamento #{quote.id.slice(0, 8)}
              </p>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {section === "dados-pessoais" && (
                  <div>
                    <dt className="text-xs text-white/50">
                      WhatsApp informado
                    </dt>
                    <dd className="break-all text-white/85">
                      {quote.whatsapp}
                    </dd>
                  </div>
                )}
                {section === "endereco" && (
                  <div>
                    <dt className="text-xs text-white/50">CEP informado</dt>
                    <dd className="text-white/85">{quote.postalCode}</dd>
                  </div>
                )}
                {section === "preferencias" && (
                  <>
                    <div>
                      <dt className="text-xs text-white/50">
                        Escala solicitada
                      </dt>
                      <dd className="text-white/85">
                        {quote.scale || "A definir"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-white/50">
                        Acabamento solicitado
                      </dt>
                      <dd className="text-white/85">
                        {quote.finishing || "A definir"}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </div>
          ) : (
            <p className="text-sm text-white/60">
              Nenhuma informação correspondente foi encontrada entre as cinco
              solicitações mais recentes. Isso não significa que não existam
              dados em orçamentos mais antigos.
            </p>
          )}
          <Link
            className={secondaryClass + " mt-4"}
            to={
              TONECOS_COMMERCIAL_ROUTES.history +
              (quote ? "?quote=" + encodeURIComponent(quote.id) : "")
            }
          >
            {quote ? "Abrir orçamento de origem" : "Consultar meus orçamentos"}
          </Link>
        </>
      )}
    </section>
  );
}

function CurrentCatalogSelection() {
  const { selectedModels, setSelectedModels } = useCatalogBrowsing();

  return (
    <section className={panelClass} aria-label="Seleção atual de modelos">
      <h2 className="mb-3 text-lg font-semibold">Sua seleção de modelos</h2>
      <p className="mb-5 text-sm leading-6 text-white/65">
        Esta é a seleção atual do catálogo para solicitar orçamento. Ela não
        representa uma compra nem o inventário de peças adquiridas.
      </p>
      {selectedModels.length === 0 ? (
        <p className="mb-5 text-sm text-white/60">
          Você ainda não escolheu modelos para solicitar orçamento.
        </p>
      ) : (
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
            {selectedModels.length}{" "}
            {selectedModels.length === 1
              ? "modelo selecionado"
              : "modelos selecionados"}
          </p>
          <ul className="space-y-2">
            {selectedModels.map((model) => (
              <li
                key={model.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-white/15 p-4"
              >
                <div className="min-w-0">
                  <Link
                    to={"/modelos/" + encodeURIComponent(model.slug)}
                    className="font-medium text-white/90 hover:text-[hsl(var(--gold-accent))]"
                  >
                    {model.name}
                  </Link>
                  <p className="mt-1 text-xs text-white/50">{model.code}</p>
                </div>
                <button
                  type="button"
                  className="min-h-10 border border-white/25 px-3 text-xs text-white/70 hover:border-white/60"
                  aria-label={"Remover " + model.name + " da seleção"}
                  onClick={() =>
                    setSelectedModels((models) =>
                      models.filter((item) => item.id !== model.id),
                    )
                  }
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Link className={actionClass} to="/modelos">
          Explorar modelos
        </Link>
        {selectedModels.length > 0 && (
          <Link
            className={secondaryClass}
            to={TONECOS_COMMERCIAL_ROUTES.request}
          >
            Revisar solicitação
          </Link>
        )}
      </div>
    </section>
  );
}

function CustomerSectionContent({
  slug,
  userId,
}: {
  slug: string;
  userId: string;
}) {
  if (slug === "dados-pessoais") {
    return (
      <div className="space-y-6">
        <CustomerComplementaryEditor section="dados-pessoais" />
        <RecentQuoteContext userId={userId} section="dados-pessoais" />
      </div>
    );
  }
  if (slug === "endereco") {
    return (
      <div className="space-y-6">
        <CustomerComplementaryEditor section="endereco" />
        <RecentQuoteContext userId={userId} section="endereco" />
      </div>
    );
  }
  if (slug === "notificacoes") {
    return <TonecosCustomerNotifications userId={userId} />;
  }
  if (slug === "preferencias") {
    return (
      <div className="space-y-6">
        <CustomerComplementaryEditor section="preferencias" />
        <RecentQuoteContext userId={userId} section="preferencias" />
      </div>
    );
  }
  if (slug === "pedidos" || slug === "producao") {
    return <TonecosCustomerActivity userId={userId} area={slug} />;
  }
  if (slug === "suporte") {
    return (
      <section className={panelClass}>
        <h2 className="mb-3 text-lg font-semibold">Atendimento TONART</h2>
        <p className="mb-5 text-sm text-white/65">
          Use os canais oficiais para conversar com o estúdio. Suas respostas
          comerciais permanecem disponíveis no histórico de orçamentos.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className={actionClass} to="/contato">
            Entrar em contato
          </Link>
          <Link
            className={secondaryClass}
            to={TONECOS_COMMERCIAL_ROUTES.history}
          >
            Meus orçamentos
          </Link>
        </div>
      </section>
    );
  }
  if (slug === "pagamentos") return <CustomerQuotePayments userId={userId} />;
  if (slug === "assinatura" || slug === "assinaturas") {
    return PUBLIC_SUBSCRIPTIONS_ENABLED ? (
      <SubscriptionSection userId={userId} commercialMvp />
    ) : (
      <TonecosSubscriptionUnavailablePanel />
    );
  }
  if (slug === "colecao") {
    return <CurrentCatalogSelection />;
  }
  return (
    <section role="alert" className={panelClass}>
      <p>Esta seção não está disponível. Use a navegação da Minha Conta.</p>
      <Link
        className={secondaryClass + " mt-4"}
        to={TONECOS_COMMERCIAL_ROUTES.account}
      >
        Minha Conta
      </Link>
    </section>
  );
}

export default function TonecosCustomerSections() {
  const location = useLocation();
  const sectionSlug = location.pathname.split("/").filter(Boolean).at(-1) ?? "";
  const [state, setState] = useState<
    "checking" | "guest" | "authenticated" | "error"
  >("checking");
  const [attempt, setAttempt] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setState("checking");
    setUserId(null);
    getTonecosCurrentUser()
      .then((user) => {
        if (!active) return;
        setUserId(user?.id ?? null);
        setState(user ? "authenticated" : "guest");
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const original = profileNavigationConfig
    .flatMap((group) => group.subSections)
    .find((item) => item.path.endsWith("/" + sectionSlug));
  const section = restoredSections.find((item) => item.slug === sectionSlug);
  const title = section?.title ?? original?.label ?? "Minha Conta";
  const description =
    section?.summary ??
    "Acesse os recursos do sistema original na mesma conta TONART.";
  return (
    <CommercialPage title={title} intro={description}>
      {state === "checking" && <p role="status">Verificando sua conta...</p>}
      {state === "error" && (
        <div role="alert" className={panelClass}>
          <p className="mb-4">Não foi possível verificar a sessão.</p>
          <button
            className={secondaryClass}
            onClick={() => setAttempt((v) => v + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {state === "guest" && (
        <div className={panelClass}>
          <p className="mb-4">Entre na sua conta para acessar esta área.</p>
          <Link
            className={actionClass}
            to={
              TONECOS_COMMERCIAL_ROUTES.login +
              "?next=" +
              encodeURIComponent(location.pathname)
            }
          >
            Entrar ou criar conta
          </Link>
        </div>
      )}
      {state === "authenticated" && userId && (
        <TonecosCustomerWorkspace>
          <CustomerSectionContent slug={sectionSlug} userId={userId} />
        </TonecosCustomerWorkspace>
      )}
    </CommercialPage>
  );
}
