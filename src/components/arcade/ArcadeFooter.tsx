/**
 * Arcade Footer - Metal Slug Style
 * 
 * Consistent with the arcade aesthetic used across all public pages.
 */

import { Link } from "react-router-dom";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Mail, Phone, MessageCircle, ExternalLink } from "lucide-react";

const navLinks = [
  { to: "/", label: "Início" },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/colecoes", label: "Coleções" },
  { to: "/planos", label: "Planos" },
  { to: "/sobre", label: "Sobre" },
  { to: "/contato", label: "Contato" },
];

const accountLinks = [
  { to: "/perfil", label: "Minha Conta" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/pagamentos", label: "Pagamentos" },
  { to: "/wishlist", label: "Wishlist" },
];

export function ArcadeFooter() {
  const { data: settings } = useSystemSettings();

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
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
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
                ORDAX
              </h3>
              <p
                className="text-[7px] tracking-[0.3em] uppercase text-[hsl(0,0%,35%)] mt-0.5"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                by Tonecos Studios
              </p>
            </Link>

            <p className="text-xs text-[hsl(0,0%,40%)] leading-relaxed max-w-sm font-mono">
              Colecionáveis premium produzidos sob encomenda. Cada peça é artesanalmente criada
              com acabamento e pintura de alta qualidade.
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

          {/* Account */}
          <div>
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
          </div>

          {/* Contact */}
          <div>
            <h4
              className="text-[8px] tracking-[0.3em] uppercase text-[hsl(var(--gold-accent)/0.6)] mb-5"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              Contato
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href={`mailto:${settings?.contact_email || "contato@ordax.com.br"}`}
                  className="flex items-center gap-2 text-xs font-mono text-[hsl(0,0%,45%)] hover:text-[hsl(var(--gold-accent))] transition-colors group"
                >
                  <Mail className="w-3.5 h-3.5 text-[hsl(0,0%,30%)] group-hover:text-[hsl(var(--gold-accent))] transition-colors" />
                  <span className="tracking-wider">
                    {settings?.contact_email || "contato@ordax.com.br"}
                  </span>
                </a>
              </li>
              {settings?.phone_primary && (
                <li>
                  <a
                    href={`tel:${settings.phone_primary}`}
                    className="flex items-center gap-2 text-xs font-mono text-[hsl(0,0%,45%)] hover:text-[hsl(var(--gold-accent))] transition-colors group"
                  >
                    <Phone className="w-3.5 h-3.5 text-[hsl(0,0%,30%)] group-hover:text-[hsl(var(--gold-accent))] transition-colors" />
                    <span className="tracking-wider">{settings.phone_primary}</span>
                  </a>
                </li>
              )}
              {settings?.phone_whatsapp && (
                <li>
                  <a
                    href={`https://wa.me/${settings.phone_whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-mono text-[hsl(0,0%,45%)] hover:text-[hsl(var(--gold-accent))] transition-colors group"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[hsl(0,0%,30%)] group-hover:text-[hsl(var(--gold-accent))] transition-colors" />
                    <span className="tracking-wider">{settings.phone_whatsapp}</span>
                    <ExternalLink className="w-2.5 h-2.5 text-[hsl(0,0%,25%)]" />
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-[hsl(var(--gold-accent)/0.08)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-mono text-[hsl(0,0%,30%)] tracking-wider">
            &copy; {new Date().getFullYear()} ORDAX • TONECOS STUDIOS — TODOS OS DIREITOS RESERVADOS
          </p>

          <div className="flex items-center gap-4">
            <Link
              to="/termos"
              className="text-[10px] font-mono text-[hsl(0,0%,30%)] hover:text-[hsl(var(--gold-accent))] transition-colors tracking-wider uppercase"
            >
              Termos
            </Link>
            <span className="text-[hsl(0,0%,15%)]">•</span>
            <Link
              to="/privacidade"
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
