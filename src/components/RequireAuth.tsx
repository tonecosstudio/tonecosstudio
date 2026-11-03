import { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { PUBLIC_ROUTES, loginReturnToPath } from "@/config/routes";

export default function RequireAuth({ children }: PropsWithChildren) {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const previewReadOnly = import.meta.env.VITE_PREVIEW_READ_ONLY === "true";

  if (previewReadOnly) {
    return <Navigate to={PUBLIC_ROUTES.catalogModels} replace />;
  }

  // Não renderizar nada durante o loading inicial para evitar flash
  if (isLoading) {
    return null;
  }

  if (!user) return <Navigate to={loginReturnToPath(location.pathname + location.search)} replace />;
  return <>{children}</>;
}
