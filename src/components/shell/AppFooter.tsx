import { Link } from "react-router-dom";

export default function AppFooter() {
  return (
    <footer className="border-t border-white/10 bg-foreground text-background">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-[2fr_1fr_1fr]">
          {/* Sobre */}
          <div>
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 bg-background rounded-sm flex items-center justify-center">
                <span className="text-foreground font-bold text-lg">O</span>
              </div>
              <div>
                <p className="font-bold text-background text-lg">ORDAX</p>
                <p className="text-xs text-background/60">by Tonecos Studios</p>
              </div>
            </Link>
            <p className="text-sm text-background/70 leading-relaxed max-w-md">
              Colecionáveis premium produzidos sob encomenda. Cada peça é artesanalmente criada pela Tonecos Studios com acabamento e pintura de alta qualidade.
            </p>
          </div>

          {/* Navegação */}
          <div>
            <h3 className="font-semibold text-background mb-4 text-sm uppercase tracking-wider">Navegação</h3>
            <ul className="space-y-3 text-sm text-background/70">
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
                <Link to="/orcamento/carrinho" className="hover:text-background transition-colors">
                  Carrinho
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
            <h3 className="font-semibold text-background mb-4 text-sm uppercase tracking-wider">Contato</h3>
            <ul className="space-y-3 text-sm text-background/70">
              <li>
                <a href="mailto:contato@tonecos.com" className="hover:text-background transition-colors">
                  contato@tonecos.com
                </a>
              </li>
              <li>
                <a href="tel:+5511999999999" className="hover:text-background transition-colors">
                  +55 (11) 9999-9999
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-background/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-background/50">
          <p>&copy; {new Date().getFullYear()} Ordax • Tonecos Studios. Todos os direitos reservados.</p>
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
