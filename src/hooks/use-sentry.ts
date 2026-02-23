import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { setUser, addBreadcrumb } from "@/lib/sentry";

/**
 * Hook para integrar Sentry com autenticação
 * Atualiza o contexto do usuário no Sentry quando o usuário faz login/logout
 */
export function useSentry() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Define usuário no Sentry
      setUser({
        id: user.id,
        email: user.email,
      });

      // Adiciona breadcrumb de login
      addBreadcrumb("User logged in", "auth", {
        userId: user.id,
        email: user.email,
      });
    } else {
      // Remove usuário do Sentry
      setUser(null);

      // Adiciona breadcrumb de logout
      addBreadcrumb("User logged out", "auth");
    }
  }, [user]);
}
