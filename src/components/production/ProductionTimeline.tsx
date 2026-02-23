import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCTION_STAGES, type ProductionPhotoRow, type ProductionRow, type ProductionUpdateRow } from "@/lib/production";
import { useProductionRealtime } from "@/hooks/use-production-realtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ProductionTimeline(props: { quoteId: string; title?: string; showHeader?: boolean }) {
  const { quoteId, title = "Timeline de Produção", showHeader = true } = props;

  const q = useQuery({
    queryKey: ["production", quoteId],
    queryFn: async () => {
      const { data: prod, error: prodErr } = await supabase
        .from("quote_production")
        .select("id,quote_id,current_stage,started_at,updated_at")
        .eq("quote_id", quoteId)
        .maybeSingle();
      if (prodErr) throw prodErr;

      const { data: updates, error: updErr } = await supabase
        .from("quote_production_updates")
        .select("id,quote_id,stage,note,created_at,created_by")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: true });
      if (updErr) throw updErr;

      const updateIds = (updates ?? []).map((u: any) => u.id);
      const { data: photos, error: phErr } = updateIds.length
        ? await supabase
            .from("quote_production_photos")
            .select("id,quote_id,update_id,url,caption,created_at,created_by")
            .eq("quote_id", quoteId)
            .in("update_id", updateIds)
            .order("created_at", { ascending: true })
        : { data: [], error: null };
      if (phErr) throw phErr;

      return {
        production: (prod ?? null) as ProductionRow | null,
        updates: (updates ?? []) as ProductionUpdateRow[],
        photos: (photos ?? []) as ProductionPhotoRow[],
      };
    },
  });

  useProductionRealtime(quoteId, true);

  const photosByUpdate = useMemo(() => {
    const map = new Map<string, ProductionPhotoRow[]>();
    for (const p of q.data?.photos ?? []) {
      const arr = map.get(p.update_id) ?? [];
      arr.push(p);
      map.set(p.update_id, arr);
    }
    return map;
  }, [q.data?.photos]);

  const current = q.data?.production?.current_stage ?? null;
  const currentIndex = current ? PRODUCTION_STAGES.findIndex((s) => s.key === current) : -1;

  return (
    <Card className="border border-border bg-card shadow-sm">
      {showHeader ? (
        <CardHeader className="border-b border-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <Badge variant="secondary" className="border border-border">
              {current ? PRODUCTION_STAGES.find((s) => s.key === current)?.label ?? current : "Aguardando início"}
            </Badge>
          </div>
        </CardHeader>
      ) : null}

      <CardContent className="pt-6 space-y-6">
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : !q.data?.production ? (
          <div className="text-sm text-muted-foreground">Timeline ainda não iniciada.</div>
        ) : (
          <div className="space-y-6">
            <ol className="grid gap-3">
              {PRODUCTION_STAGES.map((s, idx) => {
                const done = currentIndex >= 0 && idx <= currentIndex;
                return (
                  <li key={s.key} className="flex items-center gap-3">
                    <span
                      className={
                        "inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-semibold " +
                        (done ? "bg-foreground text-background" : "bg-muted text-muted-foreground")
                      }
                      aria-hidden
                    >
                      {idx + 1}
                    </span>
                    <span className={done ? "text-foreground font-medium" : "text-muted-foreground"}>{s.label}</span>
                  </li>
                );
              })}
            </ol>

            <div className="space-y-5">
              {(q.data?.updates ?? []).length === 0 ? (
                <div className="rounded-sm border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Sem atualizações ainda.
                </div>
              ) : (
                (q.data?.updates ?? [])
                  .slice()
                  .reverse()
                  .map((u) => {
                    const label = PRODUCTION_STAGES.find((s) => s.key === u.stage)?.label ?? u.stage;
                    const photos = photosByUpdate.get(u.id) ?? [];
                    return (
                      <section key={u.id} className="rounded-sm border border-border bg-muted/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="border border-border">
                              {label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString("pt-BR")}</span>
                          </div>
                        </div>

                        {u.note ? <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{u.note}</p> : null}

                        {photos.length ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {photos.map((p) => (
                              <figure key={p.id} className="overflow-hidden rounded-sm border border-border bg-card">
                                <img src={p.url} alt={p.caption || "Foto de progresso"} className="h-48 w-full object-cover" loading="lazy" />
                                {p.caption ? (
                                  <figcaption className="p-2 text-xs text-muted-foreground">{p.caption}</figcaption>
                                ) : null}
                              </figure>
                            ))}
                          </div>
                        ) : null}
                      </section>
                    );
                  })
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
