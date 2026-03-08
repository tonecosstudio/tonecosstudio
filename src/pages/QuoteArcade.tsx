// @ts-nocheck
import { ArcadePage, ArcadeCard, ArcadeSectionTitle, GlitchText } from "@/components/arcade/ArcadeLayout";
import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Package, Ruler, Calendar, FileText, Loader2, Send } from "lucide-react";

const quoteSchema = z.object({
  quantity: z.number().int().min(1).max(50),
  scale: z.string().trim().min(1, "Informe o tamanho").max(80),
  deadline: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(1200).optional(),
});

export default function QuoteArcade() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const modelId = params.get("model");

  const [quantityRaw, setQuantityRaw] = useState("1");
  const [scale, setScale] = useState("");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  const modelQuery = useQuery({
    queryKey: ["model-for-quote", modelId],
    enabled: Boolean(modelId),
    queryFn: async () => {
      const { data, error } = await supabase.from("models").select("*").eq("id", modelId!).single();
      if (error) throw error;
      return data;
    },
  });

  const model = modelQuery.data;
  const imageUrl = model?.image_bucket && model?.image_path
    ? supabase.storage.from(model.image_bucket).getPublicUrl(model.image_path).data.publicUrl
    : null;

  const handleSubmit = async () => {
    if (!user) { navigate("/login"); return; }
    const parsed = quoteSchema.safeParse({
      quantity: Number(quantityRaw),
      scale,
      deadline: deadline || undefined,
      notes: notes || undefined,
    });
    if (!parsed.success) {
      toast({ title: "Dados inválidos", description: parsed.error.issues[0]?.message, variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from("quotes").insert({
        user_id: user.id,
        status: "pending",
        notes: `Modelo: ${model?.name || modelId}\nQtd: ${parsed.data.quantity}\nEscala: ${parsed.data.scale}\nPrazo: ${parsed.data.deadline || "Sem prazo"}\nObs: ${parsed.data.notes || "—"}`,
      });
      if (error) throw error;
      toast({ title: "Orçamento enviado!", description: "Entraremos em contato em breve." });
      navigate("/dashboard");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <ArcadePage title="Solicitar Orçamento | ORDAX" description="Solicite um orçamento personalizado">
      <section className="relative py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-[hsl(var(--gold-accent))] rounded-full animate-pulse" />
            <span className="font-mono text-[9px] text-[hsl(var(--gold-accent))] tracking-[0.3em] uppercase" style={{ fontFamily: "'Press Start 2P', monospace" }}>
              MISSION REQUEST
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-[0.15em] mb-2" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>
            <GlitchText text="ORÇAMENTO" />
          </h1>
          <p className="font-mono text-xs text-[hsl(0,0%,45%)] tracking-wider">Solicite uma peça personalizada</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Model Preview */}
          {model && (
            <ArcadeCard className="overflow-hidden">
              <div className="aspect-square bg-[hsl(0,0%,8%)]">
                {imageUrl ? (
                  <img src={imageUrl} alt={model.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-[hsl(0,0%,15%)]" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-bold tracking-wider text-lg" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}>{model.name}</h2>
                {model.franchise && <p className="font-mono text-[10px] text-[hsl(var(--gold-accent)/0.6)] tracking-wider">{model.franchise}</p>}
              </div>
            </ArcadeCard>
          )}

          {/* Form */}
          <ArcadeCard hover={false} className="p-6">
            <ArcadeSectionTitle>DETALHES DO PEDIDO</ArcadeSectionTitle>
            <div className="space-y-4">
              <div>
                <label className="font-mono text-[10px] text-[hsl(0,0%,50%)] tracking-widest uppercase flex items-center gap-1 mb-1">
                  <Package className="w-3 h-3" /> QUANTIDADE
                </label>
                <Input value={quantityRaw} onChange={e => setQuantityRaw(e.target.value)} type="number" min={1} max={50} className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono" />
              </div>

              <div>
                <label className="font-mono text-[10px] text-[hsl(0,0%,50%)] tracking-widest uppercase flex items-center gap-1 mb-1">
                  <Ruler className="w-3 h-3" /> TAMANHO / ESCALA *
                </label>
                <Input value={scale} onChange={e => setScale(e.target.value)} placeholder="Ex: 1/6, 30cm..." className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono" />
              </div>

              <div>
                <label className="font-mono text-[10px] text-[hsl(0,0%,50%)] tracking-widest uppercase flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3" /> PRAZO DESEJADO
                </label>
                <Input value={deadline} onChange={e => setDeadline(e.target.value)} placeholder="Ex: 30 dias" className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono" />
              </div>

              <div>
                <label className="font-mono text-[10px] text-[hsl(0,0%,50%)] tracking-widest uppercase flex items-center gap-1 mb-1">
                  <FileText className="w-3 h-3" /> OBSERVAÇÕES
                </label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Detalhes adicionais..." className="bg-[hsl(0,0%,8%)] border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-xs" />
              </div>

              <button
                onClick={handleSubmit}
                disabled={sending || !scale.trim()}
                className="w-full flex items-center justify-center gap-2 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,7%)] font-mono uppercase tracking-[0.15em] text-xs h-11 hover:brightness-110 transition-all disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                ENVIAR ORÇAMENTO
              </button>
            </div>
          </ArcadeCard>
        </div>
      </section>
    </ArcadePage>
  );
}
