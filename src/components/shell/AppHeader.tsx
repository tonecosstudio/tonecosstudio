import { useState, memo, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";

import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBadge } from "@/components/NotificationBadge";

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
          <span className="text-lg font-bold tracking-tight text-background">ORDAX</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink
            to="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
            activeClassName="text-background bg-background/15"
          >
            Home
          </NavLink>

          <NavLink
            to="/catalogo"
            className="rounded-md px-3 py-2 text-sm font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
            activeClassName="text-background bg-background/15"
          >
            Catálogo
          </NavLink>

          <NavLink
            to="/colecoes"
            className="rounded-md px-3 py-2 text-sm font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
            activeClassName="text-background bg-background/15"
          >
            Coleções
          </NavLink>

          <NavLink
            to="/planos"
            className="rounded-md px-3 py-2 text-sm font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
            activeClassName="text-background bg-background/15"
          >
            Planos
          </NavLink>

          <NavLink
            to="/sobre"
            className="rounded-md px-3 py-2 text-sm font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
            activeClassName="text-background bg-background/15"
          >
            Sobre
          </NavLink>

          <NavLink
            to="/contato"
            className="rounded-md px-3 py-2 text-sm font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
            activeClassName="text-background bg-background/15"
          >
            Contato
          </NavLink>

          <NavLink
            to="/orcamento/carrinho"
            className="rounded-md px-3 py-2 text-sm font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
            activeClassName="text-background bg-background/15"
          >
            Carrinho{cartCount ? ` (${cartCount})` : ""}
          </NavLink>

          {user && (
            <NavLink
              to="/perfil"
              className="rounded-md px-3 py-2 text-sm font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
              activeClassName="text-background bg-background/15"
            >
              Conta
            </NavLink>
          )}

          {isAdmin && (
            <NavLink
              to="/admin"
              className="rounded-md px-3 py-2 text-sm font-medium text-background/70 transition-colors hover:text-background hover:bg-background/10"
              activeClassName="text-background bg-background/15"
            >
              Admin
            </NavLink>
          )}

          <div className="mx-2 h-5 w-px bg-background/20" />

          {/* Badge de Notificação */}
          {user && (
            <NotificationBadge
              size="sm"
              showDetails={true}
              className="text-background hover:text-background hover:bg-background/10"
            />
          )}

          {user ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await onSignOut();
                setMobileMenuOpen(false);
              }}
              className="text-background/70 hover:text-background hover:bg-background/10"
            >
              Sair
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => navigate("/login")}
              className="bg-background text-foreground hover:bg-background/90"
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
            <div className="flex flex-col gap-6 mt-8">
              <NavLink
                to="/"
                className="text-lg font-medium text-background hover:text-background/80 transition-colors"
                activeClassName="underline"
                onClick={() => setMobileMenuOpen(false)}
              >
                Catálogo
              </NavLink>
              <NavLink
                to="/colecoes"
                className="text-lg font-medium text-background hover:text-background/80 transition-colors"
                activeClassName="underline"
                onClick={() => setMobileMenuOpen(false)}
              >
                Coleções
              </NavLink>
              <NavLink
                to="/planos"
                className="text-lg font-medium text-background hover:text-background/80 transition-colors"
                activeClassName="underline"
                onClick={() => setMobileMenuOpen(false)}
              >
                Planos
              </NavLink>
              <NavLink
                to="/sobre"
                className="text-lg font-medium text-background hover:text-background/80 transition-colors"
                activeClassName="underline"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sobre
              </NavLink>
              <NavLink
                to="/contato"
                className="text-lg font-medium text-background hover:text-background/80 transition-colors"
                activeClassName="underline"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contato
              </NavLink>
              <NavLink
                to="/orcamento/carrinho"
                className="text-lg font-medium text-background hover:text-background/80 transition-colors"
                activeClassName="underline"
                onClick={() => setMobileMenuOpen(false)}
              >
                Carrinho {cartCount ? `(${cartCount})` : ""}
              </NavLink>

              {user && (
                <NavLink
                  to="/perfil"
                  className="text-lg font-medium text-background hover:text-background/80 transition-colors"
                  activeClassName="underline"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Conta
                </NavLink>
              )}

              {isAdmin && (
                <NavLink
                  to="/admin"
                  className="text-lg font-medium text-background hover:text-background/80 transition-colors"
                  activeClassName="underline"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin
                </NavLink>
              )}

              {/* Badge de Notificação no Mobile */}
              {user && (
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-background">Notificações</span>
                  <NotificationBadge
                    size="sm"
                    showDetails={false}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (isAdmin) {
                        navigate("/admin/payments");
                      } else {
                        navigate("/my-payments");
                      }
                    }}
                  />
                </div>
              )}

              <div className="h-px bg-background/20 my-2" />

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
