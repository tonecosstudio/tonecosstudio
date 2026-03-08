import { Link } from "react-router-dom";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export default function AppFooter() {
  const { data: settings } = useSystemSettings();

  return (
    <footer className="border-t border-white/10 bg-foreground text-background">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-[2fr_1fr_1fr]">
          {/* Sobre */}
          <div>
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 bg-background rounded-sm flex items-center justify-center">
                <span className="text-foreground font-bold text-sm">O</span>
              </div>
              <div>
                <p className="font-bold text-background text-sm">ORDAX</p>
                <p className="text-[10px] text-background/60">by Tonecos Studios</p>
              </div>
            </Link>
            <p className="text-xs text-background/70 leading-relaxed max-w-md">
              Colecionáveis premium produzidos sob encomenda. Cada peça é artesanalmente criada pela
              Tonecos Studios com acabamento e pintura de alta qualidade.
            </p>
          </div>

          {/* Navegação */}
          <div>
            <h3 className="font-semibold text-background mb-4 text-xs uppercase tracking-wider">
              Navegação
            </h3>
            <ul className="space-y-3 text-xs text-background/70">
              <li>
                <Link to="/" className="hover:text-background transition-colors">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link to="/sobre" className="hover:text-background transition-colors">
                  Sobre
                </Link>
              </li>
              <li>
                <Link to="/contato" className="hover:text-background transition-colors">
                  Contato
                </Link>
              </li>
              <li>
                <Link to="/colecoes" className="hover:text-background transition-colors">
                  Coleções
                </Link>
              </li>
              <li>
                <Link to="/perfil" className="hover:text-background transition-colors">
                  Minha Conta
                </Link>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="font-semibold text-background mb-4 text-xs uppercase tracking-wider">
              Contato
            </h3>
            <ul className="space-y-3 text-xs text-background/70">
              <li>
                <a
                  href={`mailto:${settings?.contact_email || "contato@ordax.com.br"}`}
                  className="hover:text-background transition-colors"
                >
                  {settings?.contact_email || "contato@ordax.com.br"}
                </a>
              </li>
              {settings?.phone_primary && (
                <li>
                  <a
                    href={`tel:${settings.phone_primary}`}
                    className="hover:text-background transition-colors"
                  >
                    {settings.phone_primary}
                  </a>
                </li>
              )}
              {settings?.phone_whatsapp && (
                <li>
                  <a
                    href={`https://wa.me/${settings.phone_whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-background transition-colors"
                  >
                    WhatsApp: {settings.phone_whatsapp}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-background/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-background/50">
          <p>
            &copy; {new Date().getFullYear()} Ordax • Tonecos Studios. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            <a href="/termos" className="hover:text-background/70 transition-colors">
              Termos
            </a>
            <span>•</span>
            <a href="/privacidade" className="hover:text-background/70 transition-colors">
              Privacidade
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
