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
      description="Fale com a TONART Studio sobre modelos e refer√™ncias."
    >
      <ArcadeHero
        badge="TONART STUDIO"
        title="CONTATO"
        subtitle="CONVERSE DIRETAMENTE COM O EST√öDIO."
        compact
      />
      <section className="relative z-10 mx-auto max-w-2xl px-4 pb-16 md:px-6">
        <ArcadeSectionTitle>Estamos √† disposi√ß√£o</ArcadeSectionTitle>
        <ArcadeCard hover={false}>
          <div className="space-y-5 p-6 text-center md:p-8">
            <Mail
              className="mx-auto h-7 w-7 text-[hsl(var(--gold-accent))]"
              aria-hidden="true"
            />
            <h2 className∂ªßq´^