import { useState, memo, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";

import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBadge } from "@/components/NotificationBadge";
import { UserNotificationCenter } from "@/components/user/UserNotificationCenter";

type Props = {
  user: unknown | null;
  isAdmin: boolean;
  cartCount: number;
  onSignOut: () => Promise<void>;
};

function AppHeaderComponent({ user, isAdmin, cartCount, onSignOut }: Props) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Memoizar valores para evitar re-renders desnecessários
  const hasUser = !!user;
  const hasCartItems = cartCount > 0;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-foreground text-background backdrop-blur-xl will-change-transform">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="relative h-9 w-9 overflow-hidden rounded-sm bg-background">
            <div className="absolute inset-0 flex items-center justify-center text-foreground font-bold text-lg">
              O
            </div>
          </div>
          <span className="text-sm font-bold tracking-tight text-background">ORDAX</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {/* SEÇÃO 1: NAVEGAÇÃO PRINCIPAL (Público) */}
          <NavLink
            to="/"
            className="rounded-md px-3 py-2 text-xs font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
            activeClassName="text-background bg-background/15"
          >
            Início
          </NavLink>

          <NavLink
            to="/catalogo"
            className="rounded-md px-3 py-2 text-xs font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
            activeClassName="text-background bg-background/15"
          >
            Catálogo
          </NavLink>

          <NavLink
            to="/colecoes"
            className="rounded-md px-3 py-2 text-xs font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
            activeClassName="text-background bg-background/15"
          >
            Coleções
          </NavLink>

          <NavLink
            to="/planos"
            className="rounded-md px-3 py-2 text-xs font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
            activeClassName="text-background bg-background/15"
          >
            Planos
          </NavLink>

          {/* DESTAQUE: Promoção */}
          <NavLink
            to="/pre-lancamento"
            className="rounded-md px-3 py-2 text-xs font-black text-amber-400 transition-colors hover:text-amber-300 hover:bg-amber-500/10 animate-pulse"
            activeClassName="text-amber-300 bg-amber-500/15"
          >
            🔥 Voucher R$ 100
          </NavLink>

          <div className="mx-2 h-5 w-px bg-background/20" />

          {/* SEÇÃO 2: AÇÕES DO USUÁRIO (Autenticado) */}
          {user && (
            <>
              <NavLink
                to="/catalogo-personagens"
                className="rounded-md px-3 py-2 text-xs font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
                activeClassName="text-background bg-background/15"
              >
                Personagens
              </NavLink>

              <NavLink
                to="/coins/purchase"
                className="rounded-md px-3 py-2 text-xs font-medium text-amber-400 transition-colors hover:text-amber-300 hover:bg-amber-500/10"
                activeClassName="text-amber-300 bg-amber-500/15"
              >
                🪙 Coins
              </NavLink>

              <NavLink
                to="/orcamento/carrinho"
                className="rounded-md px-3 py-2 text-xs font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
                activeClassName="text-background bg-background/15"
              >
                Carrinho{cartCount ? ` (${cartCount})` : ""}
              </NavLink>
            </>
          )}

          {/* Carrinho para não autenticados */}
          {!user && (
            <NavLink
              to="/orcamento/carrinho"
              className="rounded-md px-3 py-2 text-xs font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
              activeClassName="text-background bg-background/15"
            >
              Carrinho{cartCount ? ` (${cartCount})` : ""}
            </NavLink>
          )}

          <div className="mx-2 h-5 w-px bg-background/20" />

          {/* SEÇÃO 3: CONTA E ADMIN */}
          {user && (
            <>
              <UserNotificationCenter />

              <NavLink
                to="/perfil"
                className="rounded-md px-3 py-2 text-xs font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
                activeClassName="text-background bg-background/15"
              >
                Conta
              </NavLink>
            </>
          )}

          {isAdmin && (
            <NavLink
              to="/admin"
              className="rounded-md px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:text-red-300 hover:bg-red-500/10"
              activeClassName="text-red-300 bg-red-500/15"
            >
              Admin
            </NavLink>
          )}

          {/* SEÇÃO 4: AUTENTICAÇÃO */}
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await onSignOut();
                setMobileMenuOpen(false);
              }}
              className="text-background/70 hover:text-background hover:bg-background/10 text-xs"
            >
              Sair
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => navigate("/login")}
              className="bg-background text-foreground hover:bg-background/90 text-xs"
            >
              Entrar
            </Button>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="sm" className="text-background hover:bg-background/10">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="w-[300px] bg-foreground border-white/10">
            <div className="flex flex-col gap-4 mt-8">
              {/* SEÇÃO: NAVEGAÇÃO PRINCIPAL */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-background/50 uppercase tracking-wider px-2">
                  Navegação
                </p>
                <NavLink
                  to="/"
                  className="block text-base font-medium text-background hover:text-background/80 transition-colors px-2 py-1"
                  activeClassName="underline"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Início
                </NavLink>
                <NavLink
                  to="/catalogo"
                  className="block text-base font-medium text-background hover:text-background/80 transition-colors px-2 py-1"
                  activeClassName="underline"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Catálogo
                </NavLink>
                <NavLink
                  to="/colecoes"
                  className="block text-base font-medium text-background hover:text-background/80 transition-colors px-2 py-1"
                  activeClassName="underline"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Coleções
                </NavLink>
                <NavLink
                  to="/planos"
                  className="block text-base font-medium text-background hover:text-background/80 transition-colors px-2 py-1"
                  activeClassName="underline"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Planos
                </NavLink>
                <NavLink
                  to="/pre-lancamento"
                  className="block text-base font-black text-amber-400 hover:text-amber-300 transition-colors px-2 py-1"
                  activeClassName="underline"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  🔥 Voucher R$ 100
                </NavLink>
              </div>

              <div className="h-px bg-background/20" />

              {/* SEÇÃO: MINHA CONTA (Usuário Autenticado) */}
              {user && (
                <>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-background/50 uppercase tracking-wider px-2">
                      Minha Conta
                    </p>
                    <NavLink
                      to="/perfil"
                      className="block text-base font-medium text-background hover:text-background/80 transition-colors px-2 py-1"
                      activeClassName="underline"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Perfil
                    </NavLink>
                    <NavLink
                      to="/catalogo-personagens"
                      className="block text-base font-medium text-background hover:text-background/80 transition-colors px-2 py-1"
                      activeClassName="underline"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Meus Personagens
                    </NavLink>
                    <NavLink
                      to="/coins/purchase"
                      className="block text-base font-medium text-amber-400 hover:text-amber-300 transition-colors px-2 py-1"
                      activeClassName="underline"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      🪙 Comprar Coins
                    </NavLink>
                    <NavLink
                      to="/orcamento/carrinho"
                      className="block text-base font-medium text-background hover:text-background/80 transition-colors px-2 py-1"
                      activeClassName="underline"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Carrinho {cartCount ? `(${cartCount})` : ""}
                    </NavLink>
                    <NavLink
                      to="/notificacoes"
                      className="block text-base font-medium text-background hover:text-background/80 transition-colors px-2 py-1"
                      activeClassName="underline"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Notificações
                    </NavLink>
                  </div>

                  <div className="h-px bg-background/20" />
                </>
              )}

              {/* Carrinho para não autenticados */}
              {!user && (
                <>
                  <div className="space-y-3">
                    <NavLink
                      to="/orcamento/carrinho"
                      className="block text-base font-medium text-background hover:text-background/80 transition-colors px-2 py-1"
                      activeClassName="underline"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Carrinho {cartCount ? `(${cartCount})` : ""}
                    </NavLink>
                  </div>
                  <div className="h-px bg-background/20" />
                </>
              )}

              {/* SEÇÃO: INFORMAÇÕES */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-background/50 uppercase tracking-wider px-2">
                  Informações
                </p>
                <NavLink
                  to="/sobre"
                  className="block text-base font-medium text-background hover:text-background/80 transition-colors px-2 py-1"
                  activeClassName="underline"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sobre
                </NavLink>
                <NavLink
                  to="/contato"
                  className="block text-base font-medium text-background hover:text-background/80 transition-colors px-2 py-1"
                  activeClassName="underline"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contato
                </NavLink>
              </div>

              {/* SEÇÃO: ADMIN */}
              {isAdmin && (
                <>
                  <div className="h-px bg-background/20" />
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-red-400/70 uppercase tracking-wider px-2">
                      Administração
                    </p>
                    <NavLink
                      to="/admin"
                      className="block text-base font-medium text-red-400 hover:text-red-300 transition-colors px-2 py-1"
                      activeClassName="underline"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Painel Admin
                    </NavLink>
                  </div>
                </>
              )}

              <div className="h-px bg-background/20 mt-auto" />

              {/* BOTÃO DE AUTENTICAÇÃO */}
              {user ? (
                <Button
                  variant="outline"
                  onClick={async () => {
                    await onSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="border-background/30 text-background hover:bg-background/10"
                >
                  Sair
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    navigate("/login");
                    setMobileMenuOpen(false);
                  }}
                  className="bg-background text-foreground hover:bg-background/90"
                >
                  Entrar
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export default memo(AppHeaderComponent);
