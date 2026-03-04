// @ts-nocheck
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ProductionTimeline } from "@/components/production/ProductionTimeline";
import { AdminProductionTimelineEditor } from "@/pages/admin/quotes/AdminProductionTimelineEditor";
import { AdminLayout } from "@/components/admin/AdminLayout";
import SEOHead from "@/components/SEOHead";

type QuoteRow = {
  id: string;
  user_id: string;
  status: string;
  deadline: string | null;
  notes: string | null;
  created_at: string;
};

type QuoteItemRow = {
  id: string;
  quote_id: string;
  model_id: string;
  quantity: number;
  scale: string;
};

type ModelMini = {
  id: string;
  name: string;
  franchise: string | null;
};

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

  const quotesQuery = useQuery({
    queryKey: ["admin-quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id,user_id,status,deadline,notes,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as QuoteRow[];
    },
  });

  const itemsQuery = useQuery({
    queryKey: ["admin-quote-items"],
    enabled: (quotesQuery.data ?? []).length > 0,
    queryFn: async () => {
      const quoteIds = (quotesQuery.data ?? []).map((q) => q.id);
      const { data, error } = await supabase
        .from("quote_items")
        .select("id,quote_id,model_id,quantity,scale")
        .in("quote_id", quoteIds);
      if (error) throw error;
      return (data ?? []) as QuoteItemRow[];
    },
  });

  const modelsQuery = useQuery({
    queryKey: ["admin-quote-models"],
    enabled: (itemsQuery.data ?? []).length > 0,
    queryFn: async () => {
      const modelIds = Array.from(new Set((itemsQuery.data ?? []).map((i) => i.model_id)));
      const { data, error } = await supabase
        .from("models")
        .select("id,name,franchise")
        .in("id", modelIds);
      if (error) throw error;
      return (data ?? []) as ModelMini[];
    },
  });

  const modelsById = useMemo(() => {
    const m = new Map<string, ModelMini>();
    for (const row of modelsQuery.data ?? []) m.set(row.id, row);
    return m;
  }, [modelsQuery.data]);

  const itemsByQuote = useMemo(() => {
    const map = new Map<string, QuoteItemRow[]>();
    for (const it of itemsQuery.data ?? []) {
      const arr = map.get(it.quote_id) ?? [];
      arr.push(it);
      map.set(it.quote_id, arr);
    }
    return map;
  }, [itemsQuery.data]);

  const setStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
      if (error) throw error;
      toast({ title: "Atualizado", description: `Status alterado para: ${status}` });
      quotesQuery.refetch();
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
            Pedidos registrados no sistema Ordax. A avaliação e produção são conduzidas pela Tonecos Studios.
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
              const items = itemsByQuote.get(q.id) ?? [];
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
                    <div className="rounded-sm border border-border bg-muted/30 p-4">
                      <p className="text-sm font-semibold mb-3">Itens do Pedido</p>
                      <div className="space-y-2">
                        {items.length === 0 ? (
                          <p className="text-sm text-muted-foreground">(sem itens)</p>
                        ) : (
                          items.map((it) => {
                            const m = modelsById.get(it.model_id);
                            const title = m
                              ? [m.name, m.franchise].filter(Boolean).join(" ")
                              : it.model_id;
                            return (
                              <div
                                key={it.id}
                                className="flex flex-wrap items-center justify-between gap-2 text-sm"
                              >
                                <span className="font-medium">{title}</span>
                                <span className="text-muted-foreground">
                                  {it.quantity}x • {it.scale}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

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
