import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ProductionTimeline } from "@/components/production/ProductionTimeline";
import { AdminProductionTimelineEditor } from "@/pages/admin/quotes/AdminProductionTimelineEditor";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import SEOHead from "@/components/SEOHead";
import { useAdminQuotesData } from "@/hooks/admin/useAdminQuotesData";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminQuotesPage() {
  const { toast } = useToast();
  const { quotesQuery, updateStatusMutation } = useAdminQuotesData();

  const setStatus = async (id: string, status: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status });
      toast({ title: "Atualizado", description: `Status alterado para: ${status}` });
    } catch (e) {
      toast({
        title: "Falha",
        description: e instanceof Error ? e.message : "Erro inesperado",
        variant: "destructive",
      });
    }
  };

  const rows = quotesQuery.data ?? [];

  return (
    <AdminLayout>
      <SEOHead title="Orçamentos - Admin" description="Gerenciar orçamentos de clientes" />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="h-px w-20 bg-foreground mb-6" />
          <h1 className="text-5xl font-bold tracking-tight mb-4">Orçamentos</h1>
          <p className="text-lg text-muted-foreground">
            Gerencie orçamentos de clientes do sistema
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold">Pedidos de Orçamento</h2>
            <Badge variant="secondary" className="border border-border px-4 py-2 text-base">
              {rows.length} {rows.length === 1 ? "pedido" : "pedidos"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Pedidos registrados no sistema Ordax. A avaliação e produção são conduzidas pela TONART Studio.
          </p>
        </div>

        {quotesQuery.isLoading ? (
          <Card className="border border-border bg-card shadow-sm">
            <CardContent className="p-12 text-center text-muted-foreground">
              Carregando…
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card className="border border-border bg-card shadow-sm">
            <CardContent className="p-16 text-center">
              <p className="text-2xl font-semibold mb-2">Sem pedidos ainda</p>
              <p className="text-muted-foreground">
                Quando um cliente enviar um orçamento, aparecerá aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {rows.map((q) => {
              const canStartProduction = q.status === "answered";
              return (
                <Card
                  key={q.id}
                  className="border border-border bg-card shadow-sm hover:shadow-premium transition-shadow duration-300"
                >
                  <CardHeader className="border-b border-border">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="text-xl font-semibold">
                        Pedido #{q.id.slice(0, 8)}
                      </CardTitle>
                      <Badge variant="secondary" className="border border-border">
                        {q.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground pt-2">
                      <span className="text-foreground font-medium">{fmtDate(q.created_at)}</span>
                      <span className="mx-2">•</span>
                      <span>Cliente: {q.user_id.slice(0, 8)}...</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5 pt-6">
                    {q.deadline ? (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Prazo desejado:</span>{" "}
                        <span className="text-foreground font-medium">{q.deadline}</span>
                      </div>
                    ) : null}

                    {q.notes ? (
                      <div className="rounded-sm border border-border bg-muted/30 p-4">
                        <p className="text-sm font-semibold mb-2">Observações</p>
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                          {q.notes}
                        </p>
                      </div>
                    ) : null}

                    <div className="grid gap-4">
                      <AdminProductionTimelineEditor quoteId={q.id} canStart={canStartProduction} />
                      <ProductionTimeline quoteId={q.id} title="Timeline (cliente vê isso)" />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatus(q.id, "reviewing")}
                        className="border-border hover:bg-muted"
                      >
                        Revisando
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatus(q.id, "answered")}
                        className="border-border hover:bg-muted"
                      >
                        Aprovado/Respondido
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatus(q.id, "archived")}
                        className="border-border hover:bg-muted"
                      >
                        Arquivar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
