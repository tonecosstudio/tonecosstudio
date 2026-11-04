/**
 * Arcade Footer - Metal Slug Style
 *
 * Consistent with the arcade aesthetic used across all public pages.
 */

import { Link } from "react-router-dom";
import {
  BRAND_NAME,
  BRAND_SHORT_NAME,
  BRAND_STUDIO_LABEL,
} from "@/config/brand";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Mail, Phone, MessageCircle, ExternalLink } from "lucide-react";
import {
  AUTH_ROUTES,
  PUBLIC_COLLECTIONS_ENABLED,
  PUBLIC_ROUTES,
} from "@/config/routes";
import { CONTACT } from "@/config/constants";
import { isCatalogPublicMvpEnabled } from "@/config/catalog-public-mvp";
import {
  buildSafeMailtoHref,
  buildSafeWhatsAppHref,
} from "@/lib/security/safe-open";

const navLinks: Array<{ to: string; label: string }> = [
  { to: PUBLIC_ROUTES.home, label: "Início" },
  { to: PUBLIC_ROUTES.catalog, label: "Universo" },
  { to: PUBLIC_ROUTES.about, label: "Sobre" },
  { to: PUBLIC_ROUTES.contact, label: "Contato" },
];

if (PUBLIC_COLLECTIONS_ENABLED) {
  navLinks.splice(2, 0, { to: PUBLIC_ROUTES.collections, label: "Colecoes" });
}

const accountLinks = [
  { to: AUTH_ROUTES.profile, label: "Minha Conta" },
];

export function ArcadeFooter() {
  const previewReadOnly = import.meta.env.VITE_PREVIEW_READ_ONLY === "true";
  const { data: settings } = useSystemSettings({ enabled: !previewReadOnly });
  const contactEmail = settings?.contact_email || CONTACT.CONTACT_EMAIL;
  const contactEmailHref = buildSafeMailtoHref(contactEmail);
  const whatsAppHref = settings?.phone_whatsapp
    ? buildSafeWhatsAppHref(settings.phone_whatsapp)
    : null;

  return (
    <footer className="relative border-t border-[hsl(var(--gold-accent)/0.1)] bg-[hsl(0,0%,3%)] overflow-hidden">
      {/* Scanline subtle */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 0% 50%) 2px, hsl(0 0% 50%) 4px)",
        }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--gold-accent) / 0.5) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--gold-accent) / 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className={previewReadOnly
          ? "grid gap-10 md:grid-cols-[2fr_1fr_1fr]"
          : "grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]"}>
          {/* Brand */}
          <div>
            <Link to="/" className="inline-block mb-5">
              <h3
                className="text-2xl font-black tracking-[0.3em] text-[hsl(var(--gold-accent))]"
                style={{
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  textShadow: "0 0 20px hsl(var(--gold-accent) / 0.2)",
                }}
              >
                {BRAND_SHORT_NAME}
              </h3>
              <p
                className="text-[7px] tracking-[0.3em] uppercase text-[hsl(0,0%,35%)] mt-0.5"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                {BRAND_STUDIO_LABEL}
              </p>
            </Link>

            <p className="text-xs text-[hsl(0,0%,40%)] leading-relaxed max-w-sm font-mono">
              Colecionáveis premium produzidos sob encomenda. Cada peça é
              artesanalmente criada com acabamento e pintura de alta qualidade.
            </p>

            {/* Decorative line */}
            <div className="mt-5 flex items-center gap-2">
              <div className="w-8 h-px bg-[hsl(var(--gold-accent)/0.4)]" />
              <div className="w-2 h-2 border border-[hsl(var(--gold-accent)/0.3)] rotate-45" />
              <div className="w-16 h-px bg-[hsl(var(--gold-accent)/0.2)]" />
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4
              className="text-[8px] tracking-[0.3em] uppercase text-[hsl(var(--gold-accent)/0.6)] mb-5"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              Navegação
            </h4>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-xs font-mono text-[hsl(0,0%,45%)] hover:text-[hsl(var(--gold-accent))] transition-colors tracking-wider uppercase flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 bg-[hsl(0,0%,20%)] group-hover:bg-[hsl(var(--gold-accent))] transition-colors" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account: customer-only, never visible in read-only preview. */}
          {!previewReadOnly && <div>
            <h4
              className="text-[8px] tracking-[0.3em] uppercase text-[hsl(var(--gold-accent)/0.6)] mb-5"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              Minha Conta
            </h4>
            <ul className="space-y-2.5">
              {accountLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-xs font-mono text-[hsl(0,0%,45%)] hover:text-[hsl(var(--gold-accent))] transition-colors tracking-wider uppercase flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 bg-[hsl(0,0%,20%)] group-hover:bg-[hsl(var(--gold-accent))] transition-colors" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>}

          {/* Contact */}
          <div>
            <h4
              className="text-[8px] tracking-[0.3em] uppercase text-[hsl(var(--gold-accent)/0.6)] mb-5"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              Contato
            </h4>
            {previewReadOnly ? (
              isCatalogPublicMvpEnabled() && contactEmailHref ? (
                <a href={contactEmailHref} className="flex items-center gap-2 font-mono text-xs text-[hsl(var(--gold-accent))]">
                  <Mail className="h-3.5 w-3.5" /> {contactEmail}
                </a>
              ) : (
                <p className="max-w-[16rem] font-mono text-xs leading-relaxed text-[hsl(0,0%,50%)]">
                  Atendimento em preparação. Esta prévia não recebe solicitações.
                </p>
              )
            ) : (
            <ul className="space-y-3">
              {contactEmailHref && (
                <li>
                  <a
                    href={contactEmailHref}
                    className="flex items-center gap-2 text-xs font-mono text-[hsl(0,0%,45%)] hover:text-[hsl(var(--gold-accent))] transition-colors group"
                  >
                    <Mail className="w-3.5 h-3.5 text-[hsl(0,0%,30%)] group-hover:text-[hsl(var(--gold-accent))] transition-colors" />
                    <span className="tracking-wider">{contactEmail}</span>
                  </a>
                </li>
              )}
              {settings?.phone_primary && (
                <li>
                  <a
                    href={`tel:${settings.phone_primary}`}
                    className="flex items-center gap-2 text-xs font-mono text-[hsl(0,0%,45%)] hover:text-[hsl(var(--gold-accent))] transition-colors group"
                  >
                    <Phone className="w-3.5 h-3.5 text-[hsl(0,0%,30%)] group-hover:text-[hsl(var(--gold-accent))] transition-colors" />
                    <span className="tracking-wider">
                      {settings.phone_primary}
                    </span>
                  </a>
                </li>
              )}
              {settings?.phone_whatsapp && whatsAppHref && (
                <li>
                  <a
                    href={whatsAppHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-mono text-[hsl(0,0%,45%)] hover:text-[hsl(var(--gold-accent))] transition-colors group"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[hsl(0,0%,30%)] group-hover:text-[hsl(var(--gold-accent))] transition-colors" />
                    <span className="tracking-wider">
                      {settings.phone_whatsapp}
                    </span>
                    <ExternalLink className="w-2.5 h-2.5 text-[hsl(0,0%,25%)]" />
                  </a>
                </li>
              )}
            </ul>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-[hsl(var(--gold-accent)/0.08)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-mono text-[hsl(0,0%,30%)] tracking-wider">
            &copy; {new Date().getFullYear()} {BRAND_NAME} — TODOS OS DIREITOS
            RESERVADOS
          </p>

          <div className="flex items-center gap-4">
            <Link
              to={PUBLIC_ROUTES.terms}
              className="text-[10px] font-mono text-[hsl(0,0%,30%)] hover:text-[hsl(var(--gold-accent))] transition-colors tracking-wider uppercase"
            >
              Termos
            </Link>
            <span className="text-[hsl(0,0%,15%)]">•</span>
            <Link
              to={PUBLIC_ROUTES.privacy}
              className="text-[10px] font-mono text-[hsl(0,0%,30%)] hover:text-[hsl(var(--gold-accent))] transition-colors tracking-wider uppercase"
            >
              Privacidade
            </Link>
          </div>
        </div>
      </div>

      {/* Corner accents */}
      <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-[hsl(var(--gold-accent)/0.15)]" />
      <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-[hsl(var(--gold-accent)/0.15)]" />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-[hsl(var(--gold-accent)/0.15)]" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-[hsl(var(--gold-accent)/0.15)]" />
    </footer>
  );
}
