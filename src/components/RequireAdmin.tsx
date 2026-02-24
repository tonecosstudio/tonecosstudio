import { PropsWithChildren, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/lib/roles";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
      <AppShell>
        <div className="rounded-xl border bg-surface/70 p-8 shadow-elevated">
          <h1 className="text-2xl font-semibold">Carregando…</h1>
          <p className="mt-2 text-muted-foreground">Verificando acesso.</p>
        </div>
      </AppShell>
    );
  }

  if (!user) return <Navigate to={`/login?next=${redirectTo}`} replace />;

  if (isAdmin) return <AppShell>{children}</AppShell>;

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
    <AppShell>
      <section className="rounded-xl border bg-surface/70 p-8 shadow-elevated">
        <h1 className="text-3xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Esta área é apenas para administradores. Se este é o primeiro login do projeto, você pode
          se promover a admin inicial uma única vez.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="hero" onClick={bootstrap}>
            Tornar-me admin inicial
          </Button>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            Sair
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
