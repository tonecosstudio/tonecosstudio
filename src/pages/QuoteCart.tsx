import SEOHead from "@/components/SEOHead";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuoteCart } from "@/lib/quote-cart";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type ModelMini = {
  id: string;
  name: string;
  franchise: string | null;
  category: string | null;
  subcategory: string | null;
  image_bucket: string;
  image_path: string;
};

const quoteSchema = z.object({
  deadline: z.string().trim().max(80, "Máximo 80 caracteres").optional(),
  notes: z.string().trim().max(1200, "Máximo 1200 caracteres").optional(),
  items: z
    .array(
      z.object({
        model_id: z.string().min(1),
        quantity: z
          .number({ invalid_type_error: "Quantidade inválida" })
          .int("Use um número inteiro")
          .min(1, "Mínimo 1")
          .max(50, "Máximo 50"),
        scale: z.string().trim().min(1, "Informe tamanho/escala").max(80, "Máximo 80 caracteres"),
      })
    )
    .min(1, "Adicione pelo menos 1 item"),
});

export default function QuoteCart() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, update, remove, clear } = useQuoteCart();

  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const modelIds = useMemo(() => cart.items.map((i) => i.model_id), [cart.items]);

  const modelsQuery = useQuery({
    queryKey: ["quote-cart-models", modelIds],
    enabled: modelIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("models")
        .select("id,name,franchise,category,subcategory,image_bucket,image_path")
        .in("id", modelIds);
      if (error) throw error;
      return (data ?? []) as ModelMini[];
    },
  });

  const modelsById = useMemo(() => {
    const map = new Map<string, ModelMini>();
    for (const m of modelsQuery.data ?? []) map.set(m.id, m);
    return map;
  }, [modelsQuery.data]);

  const submit = async () => {
    if (!user) return;

    const parsed = quoteSchema.safeParse({
      deadline: deadline.trim() ? deadline.trim() : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
      items: cart.items.map((i) => ({
        model_id: i.model_id,
        quantity: Number(i.quantity),
        scale: i.scale,
      })),
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

      const { error: itemsErr } = await supabase.from("quote_items").insert(
        parsed.data.items.map((it) => ({
          quote_id: quoteRow.id,
          model_id: it.model_id,
          quantity: it.quantity,
          scale: it.scale,
        }))
      );

      if (itemsErr) {
        await supabase.from("quotes").delete().eq("id", quoteRow.id);
        throw itemsErr;
      }

      toast({
        title: "Pedido enviado",
        description: "Seu orçamento foi registrado. Vamos retornar em breve.",
      });
      clear();
      setDeadline("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["admin-quotes"] });
      navigate("/");
    } catch (e) {
      toast({
        title: "Falha ao enviar",
        description: e instanceof Error ? e.message : "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Carrinho de Orçamentos"
        description="Revise seus itens e finalize sua solicitação de orçamento para estatuetas premium artesanais."
        keywords={["carrinho", "orçamento", "finalizar", "pedido"]}
        noindex={true}
      />
      <div className="mx-auto max-w-6xl">
        <div className="mb-12">
          <div className="h-px w-20 bg-foreground mb-6" />
          <div className="flex items-center justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold tracking-tight">Carrinho de Orçamentos</h1>
            <Badge variant="secondary" className="border border-border px-3 py-1 text-xs">
              {cart.items.length} {cart.items.length === 1 ? "item" : "itens"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            A Ordax organiza os itens e dados do pedido. A Tonecos Studios analisa e retorna com
            valores e prazos.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="border border-border bg-card shadow-premium">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base font-semibold">Itens do Carrinho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {cart.items.length === 0 ? (
                <div className="rounded-sm border border-border bg-muted/30 p-12 text-center">
                  <p className="text-muted-foreground mb-4">Seu carrinho está vazio.</p>
                  <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
                    <Link to="/">Ir para o Catálogo</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {cart.items.map((it) => {
                      const m = modelsById.get(it.model_id);
                      const title = m
                        ? [m.name, m.franchise].filter(Boolean).join(" ")
                        : it.model_id;
                      const meta = m
                        ? [m.franchise, m.category, m.subcategory].filter(Boolean).join(" • ")
                        : null;
                      const imageUrl = m
                        ? supabase.storage.from(m.image_bucket).getPublicUrl(m.image_path).data
                            .publicUrl
                        : null;

                      return (
                        <div
                          key={it.model_id}
                          className="rounded-sm border border-border bg-muted/30 p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                            <div className="flex min-w-0 items-start gap-4 flex-1">
                              <div className="h-24 w-32 overflow-hidden rounded-sm bg-muted border border-border flex-shrink-0">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={m?.name ?? "Produto"}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                ) : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-lg font-semibold mb-1">{title}</p>
                                <p className="text-sm text-muted-foreground">{meta || "—"}</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => remove(it.model_id)}
                              className="border-border hover:bg-muted"
                            >
                              Remover
                            </Button>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`qty-${it.model_id}`} className="text-sm font-medium">
                                Quantidade
                              </Label>
                              <Input
                                id={`qty-${it.model_id}`}
                                inputMode="numeric"
                                value={String(it.quantity ?? 1)}
                                onChange={(e) =>
                                  update(it.model_id, { quantity: Number(e.target.value) || 1 })
                                }
                                className="h-12 border-border"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor={`scale-${it.model_id}`}
                                className="text-sm font-medium"
                              >
                                Tamanho / Escala
                              </Label>
                              <Input
                                id={`scale-${it.model_id}`}
                                placeholder="Ex.: 1/6, 25cm, 1/8…"
                                value={it.scale}
                                onChange={(e) => update(it.model_id, { scale: e.target.value })}
                                className="h-12 border-border"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-4">
                    <Button asChild variant="outline" className="border-border hover:bg-muted">
                      <Link to="/">Adicionar Mais Itens</Link>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clear}
                      disabled={cart.items.length === 0}
                      className="border-border hover:bg-muted"
                    >
                      Limpar Carrinho
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border bg-card shadow-sm h-fit">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-sm font-semibold">Finalizar Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-2">
                <Label htmlFor="deadline" className="text-sm font-medium">
                  Prazo desejado (opcional)
                </Label>
                <Input
                  id="deadline"
                  placeholder="Ex.: até março / 20 dias"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="h-12 border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Observações (opcional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Ex.: versão do personagem, pose, base, pintura, referências…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-32 border-border resize-none"
                />
              </div>

              <Button
                className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-medium"
                onClick={submit}
                disabled={isSaving || cart.items.length === 0}
              >
                {isSaving ? "Enviando…" : "Enviar Pedido"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                A Ordax gerencia o seu pedido; os dados são acessados pela Tonecos Studios apenas
                para fins de orçamento e produção.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
