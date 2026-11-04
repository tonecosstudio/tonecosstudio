/** Read-only customer contact, without login, orders, or Supabase. */
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { Page } from "@/components/layouts/Page";
import { ArcadeCard, ArcadeHero, ArcadeSectionTitle, ArcadeCTA } from "@/components/arcade/ArcadeLayout";
import { PUBLIC_ROUTES } from "@/config/routes";
import { CONTACT } from "@/config/constants";
import { buildSafeMailtoHref } from "@/lib/security/safe-open";

export default function PublicCatalogContact() {
  const emailHref = buildSafeMailtoHref(CONTACT.CONTACT_EMAIL);
  return (
    <Page title="Contato" description="Fale com a Tonecos sobre modelos e referências.">
      <ArcadeHero
        badge="Canal Aberto"
        title="CONTATO"
        subtitle=">> FALE COM A TONECOS."
        compact
      />
      <section className="relative z-10 mx-auto max-w-2xl px-4 pb-16 md:px-6">
        <ArcadeSectionTitle>Contato</ArcadeSectionTitle>
        <ArcadeCard hover={false}>
          <div className="space-y-5 p-6 text-center md:p-8" role="status">
            <Mail className="mx-auto h-7 w-7 text-[hsl(var(--gold-accent))]" aria-hidden="true" />
            <h2 className="text-lg font-medium text-[hsl(0,0%,94%)]">FALE COM A TONECOS</h2>
            <p className="text-sm text-[hsl(0,0%,65%)]">
              Para conversar sobre uma referência ou modelo, envie um e-mail.
              Este catálogo é informativo e não recebe cadastro, pedidos ou pagamentos.
            </p>
            {emailHref ? (
              <a href={emailHref}
                className="inline-flex min-h-11 items-center justify-center border border-[hsl(var(--gold-accent))] px-5 font-mono text-xs uppercase tracking-[0.1em] text-[hsl(var(--gold-accent))]">
                ENVIAR E-MAIL
              </a>
            ) : (
              <Link to={PUBLIC_ROUTES.catalogModels}
                className="inline-flex min-h-11 items-center justify-center border border-[hsl(var(--gold-accent))] px-5 font-mono text-xs uppercase tracking-[0.1em] text-[hsl(var(--gold-accent))]">
                EXPLORAR MODELOS
              </Link>
            )}
          </div>
        </ArcadeCard>
      </section>
      <ArcadeCTA badge="Explorar" title="MODELOS TONECOS"
        description="Navegue pelo acervo de referências."
        primaryAction={{label:"VER MODELOS",href:PUBLIC_ROUTES.catalogModels}}
        secondaryAction={{label:"INÍCIO",href:PUBLIC_ROUTES.home}} />
    </Page>
  );
}
