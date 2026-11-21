/** Shared contact page; commercial quote CTA stays isolated behind build-time flags. */
import { Link, useSearchParams } from "react-router-dom";
import { Mail } from "lucide-react";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeCard,
  ArcadeHero,
  ArcadeSectionTitle,
  ArcadeCTA,
} from "@/components/arcade/ArcadeLayout";
import { PUBLIC_ROUTES } from "@/config/routes";
import { CONTACT } from "@/config/constants";
import { buildSafeMailtoHref } from "@/lib/security/safe-open";

const contactTopics = {
  "pre-venda": {
    title: "Sua pré-venda começa aqui",
    subtitle: "R$50 NO PEDIDO. O RESTANTE, NA FINALIZAÇÃO.",
    heading: "Vamos escolher sua próxima peça",
    description:
      "Envie o modelo desejado e suas preferências de tamanho e acabamento. A equipe confirma o orçamento e o prazo com você. A entrada de R$50 é abatida integralmente do preço da peça, e o saldo é pago na finalização.",
    subject: "Pré-venda TONART — entrada de R$50",
    body: "Olá, TONART! Quero solicitar uma pré-venda com entrada de R$50 e o restante na finalização.\n\nModelo ou link: \nTamanho desejado: \nAcabamento: \nCEP para entrega: \n\nGostaria de confirmar o valor total e o prazo da peça.",
    action: "Solicitar pré-venda por e-mail",
  },
  coins: {
    title: "Atendimento Coins",
    subtitle: "SUA CARTEIRA TONART, COM ATENDIMENTO DO ESTÚDIO.",
    heading: "Vamos conversar sobre seus Coins",
    description:
      "Fale com a equipe para consultar as condições dos seus créditos ou esclarecer uma movimentação. Utilize o e-mail da sua conta TONART para facilitar o atendimento.",
    subject: "Atendimento TONART Coins",
    body: "Olá, TONART! Gostaria de atendimento sobre minha carteira Coins.\n\nMinha dúvida: ",
    action: "Falar sobre meus Coins",
  },
} as const;

export default function PublicCatalogContact() {
  const [searchParams] = useSearchParams();
  const subject = searchParams.get("assunto");
  const topic =
    subject === "pre-venda" || subject === "coins"
      ? contactTopics[subject]
      : null;
  const baseEmailHref = buildSafeMailtoHref(CONTACT.CONTACT_EMAIL);
  const emailHref =
    baseEmailHref && topic
      ? baseEmailHref +
        "?subject=" +
        encodeURIComponent(topic.subject) +
        "&body=" +
        encodeURIComponent(topic.body)
      : baseEmailHref;
  const quotesAvailable =
    import.meta.env.VITE_TONECOS_COMMERCIAL_MVP === "true" &&
    import.meta.env.VITE_PREVIEW_READ_ONLY === "false" &&
    import.meta.env.VITE_PUBLIC_CATALOG_MVP !== "true";

  return (
    <Page
      title={topic?.title ?? "Contato"}
      description={
        topic?.description ??
        "Fale com a TONART Studio sobre modelos e referências."
      }
    >
      <ArcadeHero
        badge="TONART STUDIO"
        title={topic?.title ?? "CONTATO"}
        subtitle={topic?.subtitle ?? "CONVERSE DIRETAMENTE COM O ESTÚDIO."}
        compact
      />
      <section className="relative z-10 mx-auto max-w-2xl px-4 pb-16 md:px-6">
        <ArcadeSectionTitle>Estamos à disposição</ArcadeSectionTitle>
        <ArcadeCard hover={false}>
          <div className="space-y-5 p-6 text-center md:p-8">
            <Mail
              className="mx-auto h-7 w-7 text-[hsl(var(--gold-accent))]"
              aria-hidden="true"
            />
            <h2 className="text-lg font-medium text-[hsl(0,0%,94%)]">
              {topic?.heading ?? "FALE COM A TONART"}
            </h2>
            <p className="text-sm text-[hsl(0,0%,65%)]">
              {topic
                ? topic.description
                : quotesAvailable
                  ? "Gostou de algum modelo? Selecione as referências no catálogo e envie uma solicitação de orçamento para análise de valor e prazo. Para dúvidas gerais, você também pode escrever por e-mail. Nenhum pagamento é realizado nesta etapa."
                  : "Gostou de algum modelo ou tem dúvidas sobre referências, escalas e acabamentos? Escreva diretamente para a TONART Studio. Este catálogo é para consulta; o contato não formaliza uma encomenda."}
            </p>
            {subject === "pre-venda" ? (
              <dl className="grid grid-cols-2 gap-4 border-y border-[hsl(var(--gold-accent)/0.2)] py-5 text-left">
                <div>
                  <dt className="text-xs text-[hsl(0,0%,65%)]">No pedido</dt>
                  <dd className="mt-2 text-2xl font-semibold text-[hsl(var(--gold-accent))]">
                    R$50
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[hsl(0,0%,65%)]">
                    Na finalização
                  </dt>
                  <dd className="mt-2 text-lg font-semibold">Saldo restante</dd>
                </div>
              </dl>
            ) : null}
            <div className="flex flex-col items-center gap-3">
              {quotesAvailable && subject !== "coins" ? (
                <Link
                  to={
                    subject === "pre-venda"
                      ? PUBLIC_ROUTES.catalogModels + "?tipo=pre-venda"
                      : PUBLIC_ROUTES.quoteRequest
                  }
                  className="inline-flex min-h-11 items-center justify-center bg-[hsl(var(--gold-accent))] px-5 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-black transition-colors hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                >
                  {subject === "pre-venda"
                    ? "ESCOLHER MODELOS"
                    : "SOLICITAR ORÇAMENTO"}
                </Link>
              ) : null}
              {emailHref ? (
                <>
                  <a
                    href={emailHref}
                    className="inline-flex min-h-11 items-center justify-center border border-[hsl(var(--gold-accent))] px-5 font-mono text-xs uppercase tracking-[0.1em] text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                  >
                    {topic?.action ?? "ENVIAR E-MAIL"}
                  </a>
                  <a
                    href={emailHref}
                    className="break-all text-sm text-[hsl(0,0%,78%)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--gold-accent))]"
                  >
                    {CONTACT.CONTACT_EMAIL}
                  </a>
                </>
              ) : !quotesAvailable ? (
                <Link
                  to={PUBLIC_ROUTES.catalogModels}
                  className="inline-flex min-h-11 items-center justify-center border border-[hsl(var(--gold-accent))] px-5 font-mono text-xs uppercase tracking-[0.1em] text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                >
                  EXPLORAR MODELOS
                </Link>
              ) : null}
            </div>
            {topic && emailHref ? (
              <p className="text-xs leading-6 text-[hsl(0,0%,60%)]">
                A opção de e-mail abre seu aplicativo com o assunto preenchido.
                Revise a mensagem e envie para iniciar o atendimento.
              </p>
            ) : null}
          </div>
        </ArcadeCard>
      </section>
      {!topic ? (
        <ArcadeCTA
          badge={quotesAvailable ? "Orçamento" : "Explore"}
          title={quotesAvailable ? "SOLICITE UMA ANÁLISE" : "DESCUBRA O ACERVO"}
          description={
            quotesAvailable
              ? "Escolha as referências e envie sua solicitação para a TONART Studio."
              : "Navegue pelo acervo de referências."
          }
          primaryAction={
            quotesAvailable
              ? {
                  label: "SOLICITAR ORÇAMENTO",
                  href: PUBLIC_ROUTES.quoteRequest,
                }
              : { label: "VER MODELOS", href: PUBLIC_ROUTES.catalogModels }
          }
          secondaryAction={
            quotesAvailable
              ? { label: "VER MODELOS", href: PUBLIC_ROUTES.catalogModels }
              : { label: "INÍCIO", href: PUBLIC_ROUTES.home }
          }
        />
      ) : null}
    </Page>
  );
}
