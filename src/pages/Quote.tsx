import SEOHead from "@/components/SEOHead";
import AppShell from "@/components/AppShell";
import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Package, Ruler, Calendar, FileText } from "lucide-react";

type ModelRow = {
  id: string;
  name: string;
  franchise: string | null;
  category: string | null;
  subcategory: string | null;
  image_bucket: string;
  image_path: string;
};

const quoteSchema = z.object({
  quantity: z
    .number({ invalid_type_error: "Quantidade inválida" })
    .int("Use um número inteiro")
    .min(1, "Mínimo 1")
    .max(50, "Máximo 50"),
  scale: z.string().trim().min(1, "Informe o tamanho/escala").max(80, "Máximo 80 caracteres"),
  deadline: z.string().trim().max(80, "Máximo 80 caracteres").optional(),
  notes: z.string().trim().max(1200, "Máximo 1200 caracteres").optional(),
});

export default function Quote() {
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
  const [isSaving, setIsSaving] = useState(false);

  const modelQuery = useQuery({
    queryKey: ["quote-model", modelId],
    enabled: !!modelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("models")
        .select("id,name,franchise,category,subcategory,image_bucket,image_path")
        .eq("id", modelId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ModelRow | null;
    },
  });

  const model = modelQuery.data;
  const imageUrl = model
    ? supabase.storage.from(model.image_bucket).getPublicUrl(model.image_path).data.publicUrl
    : null;

  const submit = async () => {
    if (!user) {
      toast({ title: "Login necessário", description: "Faça login para solicitar orçamento." });
      navigate("/login");
      return;
    }

    if (!modelId) {
      toast({ title: "Selecione um produto", description: "Volte ao catálogo e escolha um item." });
      return;
    }

    const parsed = quoteSchema.safeParse({
      quantity: Number(quantityRaw),
      scale,
      deadline: deadline.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    if (!parsed.success) {
      toast({
        title: "Revise os campos",
        description: parsed.error.issues[0]?.message ?? "Dados inválidos",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: quoteRow, error: quoteErr } = await supabase
        .from("quotes")
        .insert({
          user_id: user.id,
          deadline: parsed.data.deadline ?? null,
          notes: parsed.data.notes ?? null,
          status: "new",
        })
        .select("id")
        .single();

      if (quoteErr) throw quoteErr;

      const { error: itemErr } = await supabase.from("quote_items").insert({
        quote_id: quoteRow.id,
        model_id: modelId,
        quantity: parsed.data.quantity,
        scale: parsed.data.scale,
      });

      if (itemErr) throw itemErr;

      toast({
        title: "Orçamento enviado!",
        description: "Entraremos em contato em breve com os detalhes.",
      });

      navigate("/");
    } catch (e) {
      toast({
        title: "Erro ao enviar",
        description: e instanceof Error ? e.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!modelId) {
    return (
      <AppShell>
        <div className="container py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Nenhum modelo selecionado</h1>
          <p className="text-muted-foreground mb-8">
            Volte ao catálogo e escolha um item para solicitar orçamento.
          </p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Catálogo
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <>
      <SEOHead
        title="Solicitar Orçamento"
        description="Solicite um orçamento personalizado para seu colecionável premium."
        type="website"
      />

      <div className="container py-8 sm:py-12 max-w-5xl">
        {/* Breadcrumb */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-6 -ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Catálogo
        </Button>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Formulário */}
          <div>
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                Solicitar Orçamento
              </h1>
              <p className="text-muted-foreground">
                Preencha os detalhes abaixo e entraremos em contato com o orçamento personalizado.
              </p>
            </div>

            <Card className="border-border shadow-sm">
              <CardContent className="p-6 sm:p-8 space-y-6">
                {/* Quantidade */}
                <div className="space-y-2">
                  <Label
                    htmlFor="quantity"
                    className="flex items-center gap-2 text-base font-semibold"
                  >
                    <Package className="h-4 w-4" />
                    Quantidade
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max="50"
                    value={quantityRaw}
                    onChange={(e) => setQuantityRaw(e.target.value)}
                    className="h-12 text-base"
                    placeholder="Ex: 1"
                  />
                  <p className="text-sm text-muted-foreground">
                    Quantas unidades você deseja? (Mínimo 1, máximo 50)
                  </p>
                </div>

                {/* Escala */}
                <div className="space-y-2">
                  <Label
                    htmlFor="scale"
                    className="flex items-center gap-2 text-base font-semibold"
                  >
                    <Ruler className="h-4 w-4" />
                    Tamanho / Escala *
                  </Label>
                  <Input
                    id="scale"
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                    className="h-12 text-base"
                    placeholder="Ex: 1/6, 30cm, tamanho real"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Informe a escala desejada (ex: 1/6) ou o tamanho aproximado (ex: 30cm)
                  </p>
                </div>

                {/* Prazo */}
                <div className="space-y-2">
                  <Label
                    htmlFor="deadline"
                    className="flex items-center gap-2 text-base font-semibold"
                  >
                    <Calendar className="h-4 w-4" />
                    Prazo Desejado (Opcional)
                  </Label>
                  <Input
                    id="deadline"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="h-12 text-base"
                    placeholder="Ex: 60 dias, até dezembro"
                  />
                  <p className="text-sm text-muted-foreground">
                    Tem algum prazo específico? Vamos verificar a viabilidade.
                  </p>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label
                    htmlFor="notes"
                    className="flex items-center gap-2 text-base font-semibold"
                  >
                    <FileText className="h-4 w-4" />
                    Observações (Opcional)
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[120px] text-base resize-none"
                    placeholder="Detalhes adicionais: cores específicas, poses, referências, etc."
                    maxLength={1200}
                  />
                  <p className="text-sm text-muted-foreground">{notes.length}/1200 caracteres</p>
                </div>

                {/* Botão */}
                <Button
                  onClick={submit}
                  disabled={isSaving || !scale}
                  className="w-full h-12 text-base bg-foreground text-background hover:bg-foreground/90"
                  size="lg"
                >
                  {isSaving ? "Enviando..." : "Solicitar Orçamento"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Preview do Produto */}
          <div className="lg:sticky lg:top-24 h-fit">
            <Card className="border-border shadow-sm overflow-hidden">
              {modelQuery.isLoading ? (
                <div className="aspect-[3/4] bg-muted animate-pulse" />
              ) : model && imageUrl ? (
                <>
                  <div className="aspect-[3/4] bg-muted">
                    <img
                      src={imageUrl}
                      alt={model.name}
                      className="h-full w-full object-contain p-4"
                    />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-2">{model.name}</h3>
                    {model.franchise && (
                      <p className="text-sm text-muted-foreground mb-4">{model.franchise}</p>
                    )}
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Produção artesanal sob encomenda pela Tonecos Studios
                      </p>
                    </div>
                  </CardContent>
                </>
              ) : (
                <div className="p-6 text-center text-muted-foreground">Modelo não encontrado</div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
