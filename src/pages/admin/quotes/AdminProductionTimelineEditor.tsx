import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  PRODUCTION_STAGES,
  ensureProductionForQuote,
  setProductionStage,
  uploadProductionPhoto,
  type ProductionStageKey,
} from "@/lib/production";

export function AdminProductionTimelineEditor(props: { quoteId: string; canStart: boolean }) {
  const { quoteId, canStart } = props;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [stage, setStage] = useState<ProductionStageKey>("queued");
  const [note, setNote] = useState("");
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);

  const stageLabel = useMemo(() => PRODUCTION_STAGES.find((s) => s.key === stage)?.label ?? stage, [stage]);

  const startMutation = useMutation({
    mutationFn: async () => ensureProductionForQuote(quoteId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["production", quoteId] });
      toast({ title: "Produção iniciada", description: "Timeline criada com status 'Em fila'." });
    },
    onError: (e) => {
      toast({ title: "Falha", description: e instanceof Error ? e.message : "Erro inesperado", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const upd = await setProductionStage(quoteId, stage, note);
      const list = Array.from(files ?? []);
      for (const f of list) {
        await uploadProductionPhoto({ quoteId, updateId: upd.id, file: f, caption });
      }
    },
    onSuccess: async () => {
      setNote("");
      setCaption("");
      setFiles(null);
      await qc.invalidateQueries({ queryKey: ["production", quoteId] });
      toast({ title: "Atualizado", description: `Status: ${stageLabel}` });
    },
    onError: (e) => {
      toast({ title: "Falha", description: e instanceof Error ? e.message : "Erro inesperado", variant: "destructive" });
    },
  });

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg font-semibold">Atualizar Produção</CardTitle>
          <Badge variant="secondary" className="border border-border">
            Admin
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-border hover:bg-muted"
            onClick={() => startMutation.mutate()}
            disabled={!canStart || startMutation.isPending}
          >
            {startMutation.isPending ? "Iniciando…" : "Iniciar produção"}
          </Button>
          {!canStart ? (
            <span className="text-xs text-muted-foreground self-center">Disponível após o orçamento estar aprovado/respondido.</span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Etapa</Label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as ProductionStageKey)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {PRODUCTION_STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Fotos (opcional)</Label>
            <Input type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files)} className="h-11" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Legenda das fotos (opcional)</Label>
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ex.: base pronta / pintura em andamento" className="h-11" />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Observação (opcional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: iniciamos impressão hoje" className="h-11" />
          </div>
        </div>

        <Button
          className="w-full h-11 bg-foreground text-background hover:bg-foreground/90"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Salvando…" : "Salvar atualização"}
        </Button>
      </CardContent>
    </Card>
  );
}
