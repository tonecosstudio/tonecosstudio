import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProductionRealtime } from "@/hooks/use-production-realtime";
import { useProductionTimeline } from "@/hooks/useProductionTimeline";
import { PRODUCTION_STAGES, type ProductionPhotoRow } from "@/lib/production";

interface ProductionTimelineProps {
  quoteId: string;
  title?: string;
  showHeader?: boolean;
}

export function ProductionTimeline({
  quoteId,
  title = "Timeline de Producao",
  showHeader = true,
}: ProductionTimelineProps) {
  const q = useProductionTimeline(quoteId);

  useProductionRealtime(quoteId, true);

  const photosByUpdate = useMemo(() => {
    const map = new Map<string, ProductionPhotoRow[]>();
    for (const photo of q.data?.photos ?? []) {
      const photos = map.get(photo.update_id) ?? [];
      photos.push(photo);
      map.set(photo.update_id, photos);
    }
    return map;
  }, [q.data?.photos]);

  const current = q.data?.production?.current_stage ?? null;
  const currentIndex = current ? PRODUCTION_STAGES.findIndex((stage) => stage.key === current) : -1;
  const currentLabel = current
    ? PRODUCTION_STAGES.find((stage) => stage.key === current)?.label ?? current
    : "Aguardando inicio";

  return (
    <Card className="border border-border bg-card shadow-sm">
      {showHeader ? (
        <CardHeader className="border-b border-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <Badge variant="secondary" className="border border-border">
              {currentLabel}
            </Badge>
          </div>
        </CardHeader>
      ) : null}

      <CardContent className="pt-6 space-y-6">
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : !q.data?.production ? (
          <div className="text-sm text-muted-foreground">Timeline ainda nao iniciada.</div>
        ) : (
          <div className="space-y-6">
            <ol className="grid gap-3">
              {PRODUCTION_STAGES.map((stage, index) => {
                const done = currentIndex >= 0 && index <= currentIndex;
                return (
                  <li key={stage.key} className="flex items-center gap-3">
                    <span
                      className={
                        "inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-semibold " +
                        (done ? "bg-foreground text-background" : "bg-muted text-muted-foreground")
                      }
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <span className={done ? "text-foreground font-medium" : "text-muted-foreground"}>
                      {stage.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="space-y-5">
              {q.data.updates.length === 0 ? (
                <div className="rounded-sm border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  Sem atualizacoes ainda.
                </div>
              ) : (
                q.data.updates
                  .slice()
                  .reverse()
                  .map((update) => {
                    const label =
                      PRODUCTION_STAGES.find((stage) => stage.key === update.stage)?.label ??
                      update.stage;
                    const photos = photosByUpdate.get(update.id) ?? [];
                    return (
                      <section
                        key={update.id}
                        className="rounded-sm border border-border bg-muted/20 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="border border-border">
                              {label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(update.created_at).toLocaleString("pt-BR")}
                            </span>
                          </div>
                        </div>

                        {update.note ? (
                          <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                            {update.note}
                          </p>
                        ) : null}

                        {photos.length ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {photos.map((photo) => (
                              <figure
                                key={photo.id}
                                className="overflow-hidden rounded-sm border border-border bg-card"
                              >
                                <img
                                  src={photo.url}
                                  alt={photo.caption || "Foto de progresso"}
                                  className="h-48 w-full object-cover"
                                  loading="lazy"
                                />
                                {photo.caption ? (
                                  <figcaption className="p-2 text-xs text-muted-foreground">
                                    {photo.caption}
                                  </figcaption>
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
