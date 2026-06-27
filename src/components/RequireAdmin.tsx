import { PropsWithChildren } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ScanlineOverlay } from "@/components/arcade/ArcadeLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useCurrentUserIsAdmin } from "@/lib/roles";
import { PUBLIC_ROUTES, loginReturnToPath } from "@/config/routes";
import { signOutCurrentSession } from "@/services/auth/auth-session-service";

export default function RequireAdmin({ children }: PropsWithChildren) {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const isAdminQuery = useCurrentUserIsAdmin({ currentUserId: user?.id });

  const isChecking = isLoading || (user && isAdminQuery.isLoading);
  const isAdmin = Boolean(isAdminQuery.data);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[hsl(0,0%,5%)] flex items-center justify-center relative">
        <ScanlineOverlay />
        <div className="text-center">
          <h1
            className="text-lg tracking-[0.3em] uppercase text-[hsl(var(--gold-accent))] mb-2"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "12px",
            }}
          >
            CARREGANDO...
          </h1>
          <p className="text-[hsl(0,0%,45%)] text-xs font-mono tracking-wider">
            Verificando acesso
          </p>
        </div>
      </div>
    );
  }

  if (!user)
    return (
      <Navigate to={loginReturnToPath(location.pathname + location.search)} replace />
    );

  if (isAdmin) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[hsl(0,0%,5%)] flex items-center justify-center relative">
      <ScanlineOverlay />
      <div className="max-w-md mx-auto p-8 border border-[hsl(var(--gold-accent)/0.2)] bg-[hsl(0,0%,7%)]">
        <h1
          className="text-sm tracking-[0.3em] uppercase text-[hsl(var(--gold-accent))] mb-4"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          ACESSO ADMINISTRATIVO
        </h1>
        <p className="text-[hsl(0,0%,50%)] text-xs font-mono tracking-wider mb-2 leading-relaxed">
          Esta area exige permissao administrativa ativa para consultas
          operacionais, gestao de usuarios e configuracoes internas.
        </p>
        <p className="text-[hsl(0,0%,38%)] text-[10px] font-mono tracking-wider mb-6 leading-relaxed">
          Destino solicitado: {location.pathname}
          {location.search || ""}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            type="button"
            variant="outline"
            className="text-[10px] tracking-[0.2em] uppercase font-mono border-[hsl(var(--gold-accent)/0.25)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)]"
          >
            <Link to={PUBLIC_ROUTES.catalog}>UNIVERSO</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void signOutCurrentSession()}
            className="text-[10px] tracking-[0.2em] uppercase font-mono border-[hsl(0,0%,25%)] text-[hsl(0,0%,50%)] hover:bg-[hsl(0,0%,12%)]"
          >
            SAIR
          </Button>
        </div>
      </div>
    </div>
  );
}
