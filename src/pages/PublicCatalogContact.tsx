/** Shared contact page; commercial quote CTA stays isolated behind build-time flags. */
import { Link } from "react-router-dom";
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

export default function PublicCatalogContact() {
  const emailHref = buildSafeMailtoHref(CONTACT.CONTACT_EMAIL);
  const quotesAvailable =
    import.meta.env.VITE_TONECOS_COMMERCIAL_MVP === "true" &&
    import.meta.env.VITE_PREVIEW_READ_ONLY === "false" &&
    import.meta.env.VITE_CATALOG_QUOTES_ENABLED === "true";

  return (
    <Page
      title="Contato"
      description="Fale com a TONART Studio sobre modelos e referências."
    >
      <ArcadeHero
        badge="TONART STUDIO"
        title="CONTATO"
        subtitle="CONVERSE DIRETAMENTE COM O ESTÚDIO."
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
              FALE COM A TONART
            </h2>
            <p className="text-sm text-[hsl(0,0%,65%)]">
              {quotesAvailable
                ? "Gostou de algum modelo? Selecione as referências no catálogo e envie uma solicitação de orçamento para análise de valor e prazo. Para dúvidas gerais, você também pode escrever por e-mail. Nenhum pagamento é realizado nesta etapa."
                : "Gostou de algum modelo ou tem dúvidas sobre referências, escalas e acabamentos? Escreva diretamente para a TONART Studio. Este catálogo é para consulta; o contato não formaliza uma encomenda."}
            </p>
            <div className="flex flex-col items-center gap-3">
              {quotesAvailable ? (
                <Link
                  to={PUBLIC_ROUTES.quoteRequest}
                  className="inline-flex min-h-11 items-center justify-center bg-[hsl(var(--gold-accent))] px-5 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-black transition-colors hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                >
                  SOLICITAR ORÇAMENTO
                </Link>
              ) : null}
              {emailHref ? (
                <>
                  <a
                    href={emailHref}
                    className="inline-flex min-h-11 items-center justify-center border border-[hsl(var(--gold-accent))] px-5 font-mono text-xs uppercase tracking-[0.1em] text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                  >
                    ENVIAR E-MAIL
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
          </div>
        </ArcadeCard>
      </section>
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
            ? { label: "SOLICITAR ORÇAMENTO", href: PUBLIC_ROUTES.quoteRequest }
            : { label: "VER MODELOS", href: PUBLIC_ROUTES.catalogModels }
        }
        secondaryAction={
          quotesAvailable
            ? { label: "VER MODELOS", href: PUBLIC_ROUTES.catalogModels }
            : { label: "INÍCIO", href: PUBLIC_ROUTES.home }
        }
      />
    </Page>
  );
}
