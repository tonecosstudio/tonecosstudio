import { PropsWithChildren, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScanlineOverlay } from "@/components/arcade/ArcadeLayout";

export default function RequireAdmin({ children }: PropsWithChildren) {
  const { toast } = useToast();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const isAdminQuery = useIsAdmin(user?.id);

  const isChecking = isLoading || (user && isAdminQuery.isLoading);
  const isAdmin = Boolean(isAdminQuery.data);

  const redirectTo = useMemo(
    () => encodeURIComponent(location.pathname + location.search),
    [location]
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

  const bootstrap = async () => {
    const { data, error } = await supabase.functions.invoke("bootstrap-admin", { body: {} });
    if (error) {
      toast({
        title: "Falha ao criar admin inicial",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    if (data?.ok) {
      toast({ title: "Pronto!", description: "Você virou admin inicial." });
      isAdminQuery.refetch();
    } else {
      toast({ title: "Sem permissão", description: data?.error ?? "Você não é admin." });
    }
  };

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
          Esta área é apenas para administradores. Se este é o primeiro login do projeto, você pode
          se promover a admin inicial uma única vez.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={bootstrap}
            className="text-[10px] tracking-[0.2em] uppercase font-mono border border-[hsl(var(--gold-accent)/0.4)] px-4 py-2 text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)] transition-colors"
          >
            TORNAR-ME ADMIN
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-[10px] tracking-[0.2em] uppercase font-mono border border-[hsl(0,0%,25%)] px-4 py-2 text-[hsl(0,0%,50%)] hover:bg-[hsl(0,0%,12%)] transition-colors"
          >
            SAIR
          </button>
        </div>
      </div>
    </div>
  );
}
