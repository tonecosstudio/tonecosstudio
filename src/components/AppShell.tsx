import { PropsWithChildren, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuoteCart } from "@/lib/quote-cart";
import AppHeader from "@/components/shell/AppHeader";
import AppFooter from "@/components/shell/AppFooter";

export default function AppShell({ children }: PropsWithChildren) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { count } = useQuoteCart();
  const { data: isAdmin } = useIsAdmin(user?.id);

  const signOut = useMemo(
    () => async () => {
      await supabase.auth.signOut();
      navigate("/");
    },
    [navigate]
  );

  // Esconder footer na home
  const hideFooter = location.pathname === "/";

  // Estabilizar props do header - só atualiza quando valores realmente mudam
  const headerProps = useMemo(
    () => ({
      user,
      isAdmin: Boolean(isAdmin), // Converte undefined/false para false
      cartCount: count,
      onSignOut: signOut,
    }),
    [user?.id, isAdmin, count]
  ); // Usa user?.id ao invés de user para evitar re-renders

  // Se estiver carregando, não renderizar nada para evitar flash
  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader {...headerProps} />

      {/* Corpo */}
      <main className="bg-background">{children}</main>
      {!hideFooter && <AppFooter />}
    </div>
  );
}
