import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { profileNavigationConfig } from "@/config/profile-navigation.config";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import { getTonecosCurrentUser } from "@/services/customer/tonecos-account-service";
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

export function TonecosCustomerNavigation() {
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
    <nav aria-label="Seções da Minha Conta" className="mb-6 space-y-5">
      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            {section.title}
          </h2>
          <div className="flex flex-wrap gap-2">
            {section.items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                aria-current={
                  location.pathname === item.path ? "page" : undefined
                }
                className={
                  "inline-flex min-h-10 items-center rounded-sm border px-3 py-2 text-xs transition-colors " +
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

function PendingCustomerData({
  label,
  fields,
}: {
  label: string;
  fields: string[];
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
          <label key={field} className="block space-y-2 text-sm text-white/80">
            <span>{field}</span>
            <input
              className={fieldClass}
              disabled
              placeholder="Integração pendente"
              aria-label={field}
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

function CustomerSectionContent({ slug }: { slug: string }) {
  if (slug === "dados-pessoais") {
    return (
      <PendingCustomerData
        label="Cadastro pessoal adicional"
        fields={[
          "WhatsApp",
          "CPF (para emissão fiscal quando necessário)",
          "Data de nascimento",
        ]}
      />
    );
  }
  if (slug === "endereco") {
    return (
      <PendingCustomerData
        label="Cadastro de entrega"
        fields={[
          "CEP",
          "Rua",
          "Número",
          "Complemento",
          "Bairro",
          "Cidade",
          "UF",
        ]}
      />
    );
  }
  if (slug === "preferencias" || slug === "notificacoes") {
    return (
      <PendingCustomerData
        label={
          slug === "notificacoes"
            ? "Preferências de notificações"
            : "Preferências do cliente"
        }
        fields={[
          "Canal preferido de contato",
          "Avisos sobre orçamentos",
          "Avisos de produção",
        ]}
      />
    );
  }
  if (slug === "pedidos" || slug === "producao") {
    return (
      <section className={panelClass}>
        <h2 className="mb-3 text-lg font-semibold">
          {slug === "pedidos"
            ? "Suas solicitações"
            : "Andamento das solicitações"}
        </h2>
        <p className="mb-5 text-sm text-white/65">
          Consulte seus orçamentos reais e suas respostas. Uma solicitação de
          orçamento ainda não representa compra nem início da produção.
        </p>
        <Link className={actionClass} to={TONECOS_COMMERCIAL_ROUTES.history}>
          Consultar meus orçamentos
        </Link>
      </section>
    );
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
    return (
      <section className={panelClass}>
        <h2 className="mb-3 text-lg font-semibold">Seus modelos</h2>
        <p className="mb-5 text-sm text-white/65">
          Explore o catálogo canônico e selecione peças para orçamento. O
          inventário de peças adquiridas será ligado à conta existente na etapa
          de integração dos dados.
        </p>
        <Link className={actionClass} to="/modelos">
          Explorar modelos
        </Link>
      </section>
    );
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
  useEffect(() => {
    let active = true;
    setState("checking");
    getTonecosCurrentUser()
      .then((user) => {
        if (active) setState(user ? "authenticated" : "guest");
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
              encodeURIComponent(TONECOS_COMMERCIAL_ROUTES.account)
            }
          >
            Entrar ou criar conta
          </Link>
        </div>
      )}
      {state === "authenticated" && (
        <>
          <TonecosCustomerNavigation />
          <CustomerSectionContent slug={sectionSlug} />
        </>
      )}
    </CommercialPage>
  );
}
