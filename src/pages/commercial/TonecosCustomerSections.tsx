import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { profileNavigationConfig } from "@/config/profile-navigation.config";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import {
  getMyTonecosProfile,
  getTonecosCurrentUser,
} from "@/services/customer/tonecos-account-service";
import { useCatalogBrowsing } from "@/services/catalog/catalog-browsing-context";
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

type StagedCustomerField = {
  label: string;
  type?: "text" | "tel" | "date";
  inputMode?: "numeric";
  autoComplete?: string;
};

function PendingCustomerData({
  label,
  fields,
}: {
  label: string;
  fields: StagedCustomerField[];
}) {
  return (
    <section className={panelClass} aria-label={label}>
      <h2 className="mb-2 text-lg font-semibold">{label}</h2>
      <p className="mb-5 text-sm text-white/60">
        Esta seção foi recuperada do sistema original. A integração dos dados
        pessoais será concluída na mesma conta, na etapa Supabase. Nenhum dado
        inserido aqui é armazenado nesta versão.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <label
            key={field.label}
            className="block space-y-2 text-sm text-white/80"
          >
            <span>{field.label}</span>
            <input
              className={fieldClass}
              disabled
              type={field.type ?? "text"}
              inputMode={field.inputMode}
              autoComplete={field.autoComplete}
              placeholder="Integração pendente"
              aria-label={field.label}
            />
          </label>
        ))}
      </div>
      <p className="mt-5 text-xs text-white/50">
        Para alterar nome ou telefone já disponíveis, use Dados da conta.
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

function CustomerRegisteredContacts() {
  const [profile, setProfile] = useState<
    Awaited<ReturnType<typeof getMyTonecosProfile>> | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setProfile(null);
    setLoading(true);
    setError(false);
    getMyTonecosProfile()
      .then((value) => {
        if (active) setProfile(value);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  if (loading) {
    return <p role="status">Carregando seus dados cadastrados...</p>;
  }
  if (error || !profile) {
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
  return <TonecosCustomerContactSummary profile={profile} variant="account" />;
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
        <CustomerRegisteredContacts />
        <PendingCustomerData
          label="Cadastro pessoal adicional"
          fields={[
            { label: "WhatsApp", type: "tel", autoComplete: "tel" },
            {
              label: "CPF (para emissão fiscal quando necessário)",
              inputMode: "numeric",
            },
            { label: "Data de nascimento", type: "date", autoComplete: "bday" },
          ]}
        />
      </div>
    );
  }
  if (slug === "endereco") {
    return (
      <PendingCustomerData
        label="Cadastro de entrega"
        fields={[
          { label: "CEP", inputMode: "numeric", autoComplete: "postal-code" },
          { label: "Rua", autoComplete: "address-line1" },
          { label: "Número", autoComplete: "address-line2" },
          { label: "Complemento" },
          { label: "Bairro" },
          { label: "Cidade", autoComplete: "address-level2" },
          { label: "UF", autoComplete: "address-level1" },
        ]}
      />
    );
  }
  if (slug === "notificacoes") {
    return <TonecosCustomerNotifications userId={userId} />;
  }
  if (slug === "preferencias") {
    return (
      <PendingCustomerData
        label="Preferências do cliente"
        fields={[
          { label: "Canal preferido de contato" },
          { label: "Avisos sobre orçamentos" },
          { label: "Avisos de produção" },
        ]}
      />
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
        <>
          <TonecosCustomerNavigation />
          <CustomerSectionContent slug={sectionSlug} userId={userId} />
        </>
      )}
    </CommercialPage>
  );
}
