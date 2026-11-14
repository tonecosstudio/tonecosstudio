import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { profileNavigationConfig } from "@/config/profile-navigation.config";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import {
  getMyTonecosProfile,
  getTonecosCurrentUser,
  updateMyTonecosWhatsapp,
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
    summary:
      "Documentos e contatos adicionais usados em serviços e faturamento.",
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

/** Keep one canonical destination per section even when the old profile registry
 * and the restored navigation expose the same path.
 */
export const customerSectionLinks = [
  ...new Map(
    [
      ...previousSections,
      ...restoredPaths.map(({ path, label }) => ({ path, label })),
    ].map((item) => [item.path, item] as const),
  ).values(),
];

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

type StagedCustomerField = {
  label: string;
  type?: "text" | "tel" | "date" | "select" | "checkbox";
  inputMode?: "numeric";
  autoComplete?: string;
  options?: readonly string[];
  description?: string;
};

/** Reuses the original registration fields while the single TONART profile
 * authority is being integrated. A disabled field is never submitted or stored.
 */
function PendingCustomerData({
  label,
  fields,
}: {
  label: string;
  fields: StagedCustomerField[];
}) {
  return (
    <section className={panelClass} aria-label={label}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{label}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
            A estrutura do cadastro original está preservada na mesma Minha
            Conta. Os campos complementares aguardam integração e não podem
            ser preenchidos nem enviados nesta versão.
          </p>
        </div>
        <span className="border border-white/20 px-3 py-1 text-xs text-white/60">
          Integração pendente
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <label
            key={field.label}
            className="block space-y-2 text-sm text-white/80"
          >
            {field.type === "checkbox" ? (
              <span className="flex min-h-11 items-center gap-3 rounded-sm border border-white/15 px-3 py-2">
                <input
                  type="checkbox"
                  disabled
                  aria-label={field.label}
                  className="h-4 w-4 accent-[hsl(var(--gold-accent))]"
                />
                <span>{field.label}</span>
              </span>
            ) : (
              <>
                <span>{field.label}</span>
                {field.type === "select" ? (
                  <select
                    className={fieldClass}
                    disabled
                    aria-label={field.label}
                    defaultValue=""
                  >
                    <option value="">Não configurado</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={fieldClass}
                    disabled
                    type={field.type ?? "text"}
                    inputMode={field.inputMode}
                    autoComplete={field.autoComplete}
                    placeholder="Não cadastrado"
                    aria-label={field.label}
                  />
                )}
              </>
            )}
            {field.description && (
              <span className="block text-xs leading-5 text-white/50">
                {field.description}
              </span>
            )}
          </label>
        ))}
      </div>
      <p className="mt-5 text-xs leading-5 text-white/50">
        Nenhum dado inserido aqui é armazenado nesta versão. Para alterar nome
        ou telefone já disponíveis, utilize a seção Dados da conta.
      </p>
      <Link
        className={secondaryClass + " mt-4"}
        to={TONECOS_COMMERCIAL_ROUTES.account}
      >
        Dados da conta
      </Link>
    </section>
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
  productionUpdates: false,
  marketingEmails: false,
};
const ADDRESS_FIELDS = [
  { key: "zipCode", label: "CEP", autoComplete: "postal-code", maxLength: 9 },
  { key: "street", label: "Rua", autoComplete: "address-line1", maxLength: 160 },
  { key: "number", label: "Número", autoComplete: "address-line2", maxLength: 20 },
  { key: "complement", label: "Complemento", autoComplete: "off", maxLength: 160 },
  { key: "neighborhood", label: "Bairro", autoComplete: "address-level3", maxLength: 100 },
  { key: "city", label: "Cidade", autoComplete: "address-level2", maxLength: 100 },
] as const;

type ComplementarySection = "dados-pessoais" | "endereco" | "preferencias";

/**
 * One customer editor over the existing Auth-owned public.profiles.
 * Never persists quote-level contact data, session storage or a second profile.
 */
function CustomerComplementaryEditor({ section }: { section: ComplementarySection }) {
  const [profile, setProfile] = useState<
    Awaited<ReturnType<typeof getMyTonecosProfile>> | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState<TonecosDeliveryAddress>(BLANK_DELIVERY_ADDRESS);
  const [preferences, setPreferences] = useState<TonecosContactPreferences>(BLANK_PREFERENCES);
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
        const saved = value.delivery_address;
        const object = saved !== null && typeof saved === "object" && !Array.isArray(saved)
          ? saved as Record<string, unknown>
          : {};
        const fromSaved = (key: keyof TonecosDeliveryAddress) =>
          typeof object[key] === "string" ? object[key] as string : "";
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
              ? value.preferred_contact_channel : null,
          quoteUpdates: value.quote_updates === true,
          productionUpdates: value.production_updates === true,
          marketingEmails: value.marketing_emails === true,
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
    return () => { active = false; };
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
          ? await updateMyTonecosWhatsapp(whatsapp)
          : section === "endereco"
            ? await updateMyTonecosDeliveryAddress(address)
            : await updateMyTonecosContactPreferences(preferences);
      setProfile(updated);
      setNotice("Informações salvas na sua conta.");
    } catch {
      setError("Não foi possível salvar. Confira os campos e tente novamente.");
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
          Não foi possível consultar seus dados cadastrais. Nenhuma informação foi alterada.
        </p>
        <button type="button" className={secondaryClass}
          onClick={() => setAttempt((current) => current + 1)}>
          Tentar carregar dados
        </button>
      </div>
    );
  }

  const isPersonal = section === "dados-pessoais";
  const isAddress = section === "endereco";
  return (
    <div className="space-y-6">
      {isPersonal && <TonecosCustomerContactSummary profile={profile} variant="account" />}
      <section className={panelClass} aria-label={
        isPersonal ? "WhatsApp do cadastro" :
        isAddress ? "Cadastro de entrega" : "Preferências do cliente"
      }>
        <h2 className="mb-2 text-lg font-semibold">
          {isPersonal ? "WhatsApp adicional" : isAddress ? "Cadastro de entrega" : "Preferências do cliente"}
        </h2>
        <p className="mb-5 text-sm leading-6 text-white/60">
          {isPersonal
            ? "Salve um WhatsApp distinto do telefone principal, se desejar. O contato informado em um orçamento anterior não altera este cadastro."
            : isAddress
              ? "Este endereço pertence à sua conta. O CEP de um orçamento anterior não é considerado endereço cadastrado."
              : "Estas escolhas ficam no seu perfil. Elas não ativam disparos automáticos de e-mail, SMS ou WhatsApp."}
        </p>
        {error && <p role="alert" className="mb-4 border border-red-500/40 p-3 text-sm text-red-200">{error}</p>}
        {notice && <p role="status" className="mb-4 border border-white/20 p-3 text-sm">{notice}</p>}
        <form onSubmit={(event) => { void save(event); }} className="space-y-5">
          {isPersonal && (
            <label className="block space-y-2 text-sm">
              <span>WhatsApp</span>
              <input
                className={fieldClass} type="tel" autoComplete="tel"
                aria-label="WhatsApp" maxLength={40}
                placeholder="(71) 99999-9999"
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
              />
              <span className="block text-xs text-white/50">
                Opcional. Para alterar o telefone principal, abra Dados da conta.
              </span>
            </label>
          )}
          {isAddress && (
            <div className="grid gap-4 sm:grid-cols-2">
              {ADDRESS_FIELDS.map((field) => (
                <label className="block space-y-2 text-sm" key={field.key}>
                  <span>{field.label}</span>
                  <input
                    className={fieldClass} type="text"
                    aria-label={field.label}
                    required={field.key !== "complement"}
                    maxLength={field.maxLength}
                    autoComplete={field.autoComplete}
                    inputMode={field.key === "zipCode" ? "numeric" : undefined}
                    value={address[field.key] ?? ""}
                    onChange={(event) => setAddress((current) => ({
                      ...current, [field.key]: event.target.value,
                    }))}
                  />
                </label>
              ))}
              <label className="block space-y-2 text-sm">
                <span>UF</span>
                <select
                  className={fieldClass} required aria-label="UF"
                  autoComplete="address-level1" value={address.state}
                  onChange={(event) => setAddress((current) => ({
                    ...current, state: event.target.value,
                  }))}
                >
                  <option value="">Selecione</option>
                  {[
                    "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
                    "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR",
                    "SC","SP","SE","TO",
                  ].map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </label>
            </div>
          )}
          {!isPersonal && !isAddress && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-sm">
                <span>Canal preferido de contato</span>
                <select
                  className={fieldClass} aria-label="Canal preferido de contato"
                  value={preferences.preferredContactChannel ?? ""}
                  onChange={(event) => setPreferences((current) => ({
                    ...current,
                    preferredContactChannel:
                      event.target.value === "email" ||
                      event.target.value === "whatsapp" ||
                      event.target.value === "phone"
                        ? event.target.value : null,
                  }))}
                >
                  <option value="">Não definido</option>
                  <option value="email">E-mail</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Telefone</option>
                </select>
              </label>
              {([
                ["quoteUpdates", "Avisos sobre orçamentos"],
                ["productionUpdates", "Avisos de produção"],
                ["marketingEmails", "Novidades e campanhas"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 border border-white/15 p-3 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[hsl(var(--gold-accent))]"
                    aria-label={label}
                    checked={preferences[key]}
                    onChange={(event) => setPreferences((current) => ({
                      ...current, [key]: event.target.checked,
                    }))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-3 border-t border-white/15 pt-4">
            <button className={actionClass} type="submit" disabled={busy}>
              {busy ? "Salvando..." : isPersonal ? "Salvar WhatsApp" : isAddress ? "Salvar endereço" : "Salvar preferências"}
            </button>
            {isAddress && profile.delivery_address && (
              <button type="button" className={secondaryClass} disabled={busy}
                onClick={() => { void clearAddress(); }}>
                Remover endereço
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
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
  const [page, setPage] = useState<
    Awaited<ReturnType<typeof loadMyCatalogQuotePage>> | null
  >(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (import.meta.env.VITE_CATALOG_QUOTES_ENABLED !== "true") return;
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
  if (import.meta.env.VITE_CATALOG_QUOTES_ENABLED !== "true") return null;
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
        permanente da Minha Conta. Não são reaproveitados automaticamente
        em novos orçamentos.
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
                    <dt className="text-xs text-white/50">WhatsApp informado</dt>
                    <dd className="break-all text-white/85">{quote.whatsapp}</dd>
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
                      <dt className="text-xs text-white/50">Escala solicitada</dt>
                      <dd className="text-white/85">{quote.scale || "A definir"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-white/50">Acabamento solicitado</dt>
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
        Esta é a seleção atual do catálogo para pedir orçamento. Ela não
        representa uma compra nem o inventário de peças adquiridas; essa parte
        da coleção será vinculada à Minha Conta na etapa de integração.
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
        {selectedModels.length > 0 &&
          import.meta.env.VITE_CATALOG_QUOTES_ENABLED === "true" && (
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
        <PendingCustomerData
          label="Cadastro pessoal adicional"
          fields={[
            {
              label: "CPF (para emissão fiscal quando necessário)",
              inputMode: "numeric",
              description: "Somente quando houver necessidade fiscal e tratamento autorizado.",
            },
            {
              label: "Data de nascimento",
              type: "date",
              autoComplete: "bday",
              description: "Campo opcional do cadastro original.",
            },
          ]}
        />
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
  if (
    slug === "pagamentos" ||
    slug === "assinatura" ||
    slug === "assinaturas"
  ) {
    return (
      <section className={panelClass}>
        <h2 className="mb-3 text-lg font-semibold">
          {slug === "pagamentos" ? "Financeiro da conta" : "Assinaturas"}
        </h2>
        <p className="mb-5 text-sm text-white/65">
          O módulo original está preservado. Esta versão ainda não tem operações
          financeiras ou assinaturas habilitadas na autoridade comercial. Nenhum
          pagamento ou contratação é realizado nesta tela.
        </p>
        <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.history}>
          Ver propostas recebidas
        </Link>
      </section>
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
