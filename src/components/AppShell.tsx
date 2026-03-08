import { PropsWithChildren, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import AppHeader from "@/components/shell/AppHeader";
import AppFooter from "@/components/shell/AppFooter";

export default function AppShell({ children }: PropsWithChildren) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  // Estabilizar props do header
  const headerProps = useMemo(
    () => ({
      user,
      isAdmin: Boolean(isAdmin),
      onSignOut: signOut,
    }),
    [user?.id, isAdmin]
  );

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader {...headerProps} />
      <main>{children}</main>
      {!hideFooter && <AppFooter />}
    </div>
  );
}