import { PropsWithChildren, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export default function RequireAuth({ children }: PropsWithChildren) {
  const location = useLocation();
  const { user, isLoading } = useAuth();

  const redirectTo = useMemo(
    () => encodeURIComponent(location.pathname + location.search),
    [location.pathname, location.search]
  );

  // Não renderizar nada durante o loading inicial para evitar flash
  if (isLoading) {
    return null;
  }

  if (!user) return <Navigate to={`/login?next=${redirectTo}`} replace />;
  return <AppShell>{children}</AppShell>;
}
