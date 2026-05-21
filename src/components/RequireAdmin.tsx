import { PropsWithChildren, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ScanlineOverlay } from "@/components/arcade/ArcadeLayout";
import { useAdminAccessActions } from "@/hooks/auth/useAdminAccessActions";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/lib/roles";

export default function RequireAdmin({ children }: PropsWithChildren) {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const isAdminQuery = useIsAdmin(user?.id);
  const adminActions = useAdminAccessActions({
    onBootstrapSuccess: () => {
      isAdminQuery.refetch();
    },
  });

  const isChecking = isLoading || (user && isAdminQuery.isLoading);
  const isAdmin = Boolean(isAdminQuery.data);

  const redirectTo = useMemo(
    () => encodeURIComponent(location.pathname + location.search),
    [location],
  );

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[hsl(0,0%,5%)] flex items-center justify-center relative">
        <ScanlineOverlay />
        <div className="text-center">
          <h1
            className="text-lg tracking-[0.3em] uppercase text-[hsl(var(--gold-accent))] mb-2"
            style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "12px" }}
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

  if (!user) return <Navigate to={`/login?next=${redirectTo}`} replace />;

  if (isAdmin) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[hsl(0,0%,5%)] flex items-center justify-center relative">
      <ScanlineOverlay />
      <div className="max-w-md mx-auto p-8 border border-[hsl(var(--gold-accent)/0.2)] bg-[hsl(0,0%,7%)]">
        <h1
          className="text-sm tracking-[0.3em] uppercase text-[hsl(var(--gold-accent))] mb-4"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          ACESSO RESTRITO
        </h1>
        <p className="text-[hsl(0,0%,50%)] text-xs font-mono tracking-wider mb-6 leading-relaxed">
          Esta area e apenas para administradores. Se este e o primeiro login do projeto, voce pode
          se promover a admin inicial uma unica vez.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={adminActions.bootstrap}
            disabled={adminActions.isBootstrapping}
            className="text-[10px] tracking-[0.2em] uppercase font-mono border border-[hsl(var(--gold-accent)/0.4)] px-4 py-2 text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)] transition-colors disabled:opacity-60"
          >
            TORNAR-ME ADMIN
          </button>
          <button
            onClick={adminActions.signOut}
            disabled={adminActions.isSigningOut}
            className="text-[10px] tracking-[0.2em] uppercase font-mono border border-[hsl(0,0%,25%)] px-4 py-2 text-[hsl(0,0%,50%)] hover:bg-[hsl(0,0%,12%)] transition-colors disabled:opacity-60"
          >
            SAIR
          </button>
        </div>
      </div>
    </div>
  );
}
