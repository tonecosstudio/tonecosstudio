import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2 } from "lucide-react";
import {
  buildPrettyModelNameFromFilename,
  extractNameHints,
  prettyFolderName,
} from "@/lib/collectible-naming";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type QueueRow = {
  id: string;
  storage_bucket: string;
  storage_path: string;
  status: "pending" | "skipped" | "review_later" | "processed" | "error";
  original_filename: string | null;
  ai_suggested_name: string | null;
  ai_confidence: number | null;
  ai_model_used: string | null;
};

type ClassifyResult = {
  franchise: string | null;
  category: string | null;
  subcategory: string | null;
  tags: string[];
  fromCache: boolean;
};

type FolderHint = {
  folder: string;
  prettyFolder: string;
  suggestedCategory: string | null;
  suggestedSubcategory: string | null;
  suggestedFranchise: string | null;
};

type FranchiseRow = {
  canonical: string;
  aliases: string[];
};

export default function Conveyor() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [ai, setAi] = useState<ClassifyResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const classifyTimer = useRef<number | null>(null);

  const [franchiseOverride, setFranchiseOverride] = useState<string>("");
  const [franchiseSearch, setFranchiseSearch] = useState<string>("");

  // Sugestões baseadas na pasta do upload (sem salvar automaticamente)
  const [folderHint, setFolderHint] = useState<FolderHint | null>(null);
  const [isFolderHintLoading, setIsFolderHintLoading] = useState(false);

  // Estados de confirmação tipo "Tinder": o admin precisa
  // marcar explicitamente que cada informação está correta
  // antes de aprovar de vez.
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [franchiseConfirmed, setFranchiseConfirmed] = useState(false);
  const [categoryConfirmed, setCategoryConfirmed] = useState(false);

  const progressQuery = useQuery({
    queryKey: ["queue-counts"],
    queryFn: async () => {
      try {
        const [{ count: pending }, { count: processed }, { count: review }] = await Promise.all([
          supabase
            .from("images_queue")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("images_queue")
            .select("id", { count: "exact", head: true })
            .eq("status", "processed"),
          supabase
            .from("images_queue")
            .select("id", { count: "exact", head: true })
            .eq("status", "review_later"),
        ]);
        return { pending: pending ?? 0, processed: processed ?? 0, review: review ?? 0 };
      } catch (error) {
        console.error("Error fetching queue counts:", error);
        throw error;
      }
    },
    retry: false,
  });

  const nextQuery = useQuery({
    queryKey: ["queue-next"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("images_queue")
          .select(
            "id,storage_bucket,storage_path,status,original_filename,ai_suggested_name,ai_confidence,ai_model_used"
          )
          .eq("status", "pending")
          .order("priority_at", { ascending: true })
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return data;
      } catch (error) {
        console.error("Error fetching next queue item:", error);
        throw error;
      }
    },
    retry: false,
  });

  const current = nextQuery.data;
  const imageUrl = useMemo(() => {
    if (!current) return null;
    return supabase.storage.from(current.storage_bucket).getPublicUrl(current.storage_path).data
      .publicUrl;
  }, [current]);

  const relativePath = current?.original_filename ?? null;
  const prettyNameFromFile = useMemo(
    () => buildPrettyModelNameFromFilename(relativePath),
    [relativePath]
  );
  const folderFromFile = useMemo(() => extractNameHints(relativePath).folder, [relativePath]);

  const resetForNext = () => {
    setName("");
    setAi(null);
    setFranchiseOverride("");
    setFranchiseSearch("");
    setFolderHint(null);
    setIsFolderHintLoading(false);
    setNameConfirmed(false);
    setFranchiseConfirmed(false);
    setCategoryConfirmed(false);
    qc.invalidateQueries({ queryKey: ["queue-next"] });
    qc.invalidateQueries({ queryKey: ["queue-counts"] });
  };

  // Pre-fill with AI suggestion when image loads
  useEffect(() => {
    if (current?.ai_suggested_name) {
      setName(current.ai_suggested_name);
      // Trigger classification to get full AI data
      classify(current.ai_suggested_name);
    } else {
      setName("");
      setAi(null);
    }
  }, [current?.id]);

  // Sugestão pela pasta: classificamos a pasta como "franquia/projeto" para inferir category/subcategory.
  // Isso ajuda quando o arquivo tem nome ruim tipo "goku 123".
  useEffect(() => {
    const folder = String(folderFromFile ?? "").trim();
    const prettyFolder = prettyFolderName(folder);
    if (!current?.id || !folder) {
      setFolderHint(null);
      return;
    }

    let cancelled = false;
    setIsFolderHintLoading(true);
    setFolderHint({
      folder,
      prettyFolder,
      suggestedCategory: null,
      suggestedSubcategory: prettyFolder || folder,
      suggestedFranchise: prettyFolder || folder,
    });

    (async () => {
      try {
        // Usamos a mesma função de texto (barata) para entender a pasta como franquia/projeto.
        const { data, error } = await supabase.functions.invoke("classify-name", {
          body: { name: folder },
        });
        if (error) throw error;
        if (cancelled) return;

        setFolderHint({
          folder,
          prettyFolder,
          suggestedCategory: data?.category ?? null,
          // Pela regra do projeto, sub = nome do projeto/franquia
          suggestedSubcategory: prettyFolder || data?.subcategory || folder,
          suggestedFranchise: prettyFolder || data?.franchise || folder,
        });
      } catch {
        // Se falhar, mantemos só o nome da pasta como sugestão visual.
      } finally {
        if (!cancelled) setIsFolderHintLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [current?.id, folderFromFile]);

  const classify = async (nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) {
      setAi(null);
      setFranchiseOverride("");
      return;
    }
    setIsClassifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("classify-name", {
        body: { name: trimmed },
      });
      if (error) throw error;
      setAi({
        franchise: data.franchise ?? null,
        category: data.category ?? null,
        subcategory: data.subcategory ?? null,
        tags: data.tags ?? [],
        fromCache: Boolean(data.fromCache),
      });

      // Sugestão inicial: deixa preenchido, mas permite override/confirmar
      setFranchiseOverride("");
      setFranchiseSearch(String(data.franchise ?? "").trim());

      // Sempre que reclassificar pelo nome, a validação
      // visual volta para o estado inicial.
      setNameConfirmed(false);
      setFranchiseConfirmed(false);
      setCategoryConfirmed(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha na IA", description: msg, variant: "destructive" });
      setAi(null);
    } finally {
      setIsClassifying(false);
    }
  };

  const reanalyzeWithVision = async () => {
    if (!current) return;
    setIsReanalyzing(true);
    try {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Não autenticado");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) throw new Error("VITE_SUPABASE_URL não configurado");

      const response = await fetch(`${supabaseUrl}/functions/v1/classify-image-vision`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queue_id: current.id,
          model: "gpt-4o-mini",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao reanalisar");
      }

      const result = await response.json();

      setName(result.name || "");
      setAi({
        franchise: result.franchise ?? null,
        category: result.category ?? null,
        subcategory: result.subcategory ?? null,
        tags: result.tags ?? [],
        fromCache: Boolean(result.fromCache),
      });
      setFranchiseOverride("");
      setFranchiseSearch(String(result.franchise ?? "").trim());

      // Nova análise pela imagem também reinicia as confirmações
      // para o admin revisar de novo.
      setNameConfirmed(false);
      setFranchiseConfirmed(false);
      setCategoryConfirmed(false);

      toast({
        title: "Reanálise concluída",
        description: `Confiança: ${Math.round(Number(result.confidence ?? 0))}%`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha ao reanalisar", description: msg, variant: "destructive" });
    } finally {
      setIsReanalyzing(false);
    }
  };

  const scheduleClassify = (val: string) => {
    if (classifyTimer.current) window.clearTimeout(classifyTimer.current);
    classifyTimer.current = window.setTimeout(() => classify(val), 450);
  };

  const setStatus = async (status: "skipped" | "review_later") => {
    if (!current) return;
    await supabase.from("images_queue").update({ status }).eq("id", current.id);
    resetForNext();
  };

  const skipToEnd = async () => {
    if (!current) return;
    // Mantém status pending, só joga para o fim da fila
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // +365d
    const { error } = await supabase
      .from("images_queue")
      .update({ priority_at: future.toISOString() })
      .eq("id", current.id);
    if (error) throw error;
    resetForNext();
  };

  const rejectDelete = async () => {
    if (!current) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("queue-reject", {
        body: { queueId: current.id },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Falha ao rejeitar");
      toast({ title: "Rejeitada", description: "Imagem deletada e removida da fila." });
      resetForNext();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha ao rejeitar", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const confirm = async () => {
    if (!current) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Nome obrigatório", description: "Digite um nome antes de confirmar." });
      return;
    }

    // Fluxo tipo Tinder: só deixa aprovar de vez
    // se as três informações principais foram marcadas
    // como conferidas pelo admin.
    if (!nameConfirmed || !franchiseConfirmed || !categoryConfirmed) {
      toast({
        title: "Confirme tudo antes de aprovar",
        description: "Marque Nome, Franquia e Categoria como corretos antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-model", {
        body: {
          queueId: current.id,
          name: trimmed,
          franchiseOverride: franchiseOverride.trim() || undefined,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Falha ao salvar");
      toast({ title: "Salvo", description: "Modelo criado e imagem movida." });
      resetForNext();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha ao salvar", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const nameSuggestionsQuery = useQuery({
    queryKey: ["name-suggestions", name.trim().toLowerCase()],
    enabled: name.trim().length >= 2,
    queryFn: async () => {
      const q = name.trim();
      const [m, c] = await Promise.all([
        supabase.from("models").select("name").ilike("name", `%${q}%`).limit(10),
        supabase.from("ai_name_cache").select("name").ilike("name", `%${q}%`).limit(10),
      ]);
      if (m.error) throw m.error;
      if (c.error) throw c.error;
      const names = [...(m.data ?? []), ...(c.data ?? [])].map((r: any) => String(r.name));
      // Dedup preservando ordem
      const out: string[] = [];
      const seen = new Set<string>();
      for (const n of names) {
        const key = n.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(n);
      }
      return out.slice(0, 10);
    },
  });

  const franchiseCandidatesQuery = useQuery({
    queryKey: ["franchise-candidates", franchiseSearch.trim().toLowerCase()],
    enabled: franchiseSearch.trim().length >= 2,
    queryFn: async () => {
      const q = franchiseSearch.trim();
      const { data, error } = await supabase
        .from("franchises")
        .select("canonical,aliases")
        .ilike("canonical", `%${q}%`)
        .order("canonical", { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as FranchiseRow[];
    },
  });

  // Keyboard shortcuts (ENTER confirm, SHIFT+ENTER skip, ESC review later)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return;
      if (isSaving) return;

      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        setStatus("skipped");
      } else if (e.key === "Enter") {
        e.preventDefault();
        confirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setStatus("review_later");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, isSaving]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Error Display */}
        {(progressQuery.error || nextQuery.error) && (
          <Card className="bg-destructive/10 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Erro ao carregar dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {progressQuery.error && (
                <div>
                  <p className="font-medium">Erro ao buscar contadores:</p>
                  <p className="text-sm text-muted-foreground">
                    {progressQuery.error instanceof Error
                      ? progressQuery.error.message
                      : "Erro desconhecido"}
                  </p>
                </div>
              )}
              {nextQuery.error && (
                <div>
                  <p className="font-medium">Erro ao buscar próxima imagem:</p>
                  <p className="text-sm text-muted-foreground">
                    {nextQuery.error instanceof Error
                      ? nextQuery.error.message
                      : "Erro desconhecido"}
                  </p>
                </div>
              )}
              <div className="mt-4 p-4 bg-background/50 rounded-lg">
                <p className="font-medium mb-2">Possíveis causas:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>As migrations não foram aplicadas no Supabase</li>
                  <li>Seu usuário não tem permissão de admin</li>
                  <li>A tabela images_queue não existe</li>
                </ul>
                <p className="mt-3 text-sm">
                  Execute o arquivo{" "}
                  <code className="bg-background px-1 py-0.5 rounded">
                    diagnostico-conveyor.sql
                  </code>{" "}
                  no Supabase SQL Editor para identificar o problema.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">Modo Esteira</h1>
          <Badge variant="secondary">ENTER salvar</Badge>
          <Badge variant="secondary">SHIFT+ENTER pular</Badge>
          <Badge variant="secondary">ESC revisar depois</Badge>
          <div className="ml-auto flex gap-2">
            <Badge variant="secondary">Pending: {progressQuery.data?.pending ?? "—"}</Badge>
            <Badge variant="secondary">Processed: {progressQuery.data?.processed ?? "—"}</Badge>
            <Badge variant="secondary">Review: {progressQuery.data?.review ?? "—"}</Badge>
          </div>
        </div>

        {!current ? (
          <Card className="bg-surface/70 shadow-elevated">
            <CardHeader>
              <CardTitle>Fila vazia</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Sem imagens em pending. Faça upload para começar.
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-surface/70 shadow-elevated">
            <CardHeader>
              <CardTitle>Próxima imagem</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div className="overflow-hidden rounded-xl border bg-background/40">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={current.original_filename ?? "Imagem"}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="p-10 text-muted-foreground">Sem preview</div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Nome (obrigatório)</label>
                    {current?.ai_suggested_name && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Sugestão IA{" "}
                        {current.ai_confidence != null
                          ? `(${Math.round(current.ai_confidence)}%)`
                          : ""}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {folderHint?.prettyFolder ? (
                      <Badge variant="secondary">
                        Pasta: {folderHint.prettyFolder}
                        {isFolderHintLoading ? " (analisando…)" : ""}
                      </Badge>
                    ) : null}
                    {folderHint?.suggestedCategory ? (
                      <Badge variant="secondary">
                        Sug. pasta cat: {folderHint.suggestedCategory}
                      </Badge>
                    ) : null}
                    {folderHint?.suggestedSubcategory ? (
                      <Badge variant="secondary">
                        Sug. pasta sub: {folderHint.suggestedSubcategory}
                      </Badge>
                    ) : null}
                  </div>

                  <Input
                    value={name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setName(v);
                      scheduleClassify(v);
                    }}
                    list="name-suggestions"
                    placeholder="Ex: Boneco do herói X…"
                  />

                  {prettyNameFromFile && prettyNameFromFile !== name.trim() ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setName(prettyNameFromFile);
                          scheduleClassify(prettyNameFromFile);
                        }}
                      >
                        Usar nome sugerido: {prettyNameFromFile}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        (baseado no nome do arquivo; ajuste se precisar)
                      </span>
                    </div>
                  ) : null}
                  <datalist id="name-suggestions">
                    {(nameSuggestionsQuery.data ?? []).map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                  <p className="text-xs text-muted-foreground">
                    Ao digitar, a IA sugere franquia/categoria/subcategoria/tags.{" "}
                    {isClassifying ? "(classificando…)" : ""}
                  </p>
                </div>

                <div className="rounded-xl border bg-background/50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Sugestão IA</p>
                    {ai?.fromCache ? <Badge variant="secondary">cache</Badge> : null}
                  </div>
                  <div className="mt-3 grid gap-2 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        Franquia:{" "}
                        {franchiseOverride.trim()
                          ? franchiseOverride.trim()
                          : (ai?.franchise ?? "—")}
                      </Badge>
                      <Badge variant="secondary">Categoria: {ai?.category ?? "—"}</Badge>
                      <Badge variant="secondary">Sub: {ai?.subcategory ?? "—"}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(ai?.tags ?? []).slice(0, 10).map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={nameConfirmed ? "hero" : "outline"}
                        onClick={() => setNameConfirmed((v) => !v)}
                      >
                        Nome OK
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={franchiseConfirmed ? "hero" : "outline"}
                        onClick={() => setFranchiseConfirmed((v) => !v)}
                      >
                        Franquia OK
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={categoryConfirmed ? "hero" : "outline"}
                        onClick={() => setCategoryConfirmed((v) => !v)}
                      >
                        Categoria/Sub OK
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Clique nos botões acima para marcar que Nome, Franquia e
                      Categoria/Subcategoria estão corretos. A imagem só é aprovada quando os três
                      estiverem verdes.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="hero" onClick={confirm} disabled={isSaving || !name.trim()}>
                    {isSaving ? "Salvando…" : "Confirmar (ENTER)"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => classify(name)}
                    disabled={isSaving || !name.trim() || isClassifying}
                  >
                    Reclassificar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={reanalyzeWithVision}
                    disabled={isSaving || isReanalyzing}
                    className="flex items-center gap-2"
                  >
                    {isReanalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Reanalisar com IA Vision
                      </>
                    )}
                  </Button>
                  {progressQuery.data && (
                    <p className="text-xs text-muted-foreground">
                      {progressQuery.data.pending
                        ? "Dica: use IA Vision principalmente para as imagens que sobraram depois de limpar a fila Pending."
                        : progressQuery.data.review
                          ? "Agora é um bom momento para usar IA Vision nas imagens marcadas para Revisar depois."
                          : "IA Vision é mais cara — priorize o acerto pelo nome sempre que possível."}
                    </p>
                  )}

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={isSaving}>
                        Confirmar franquia…
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Confirmar franquia</DialogTitle>
                        <DialogDescription>
                          Use isto quando houver ambiguidade (ex.: "X-Men" vs "Patrulha Canina"). Ao
                          confirmar, salvamos uma regra automática para sugerir/aplicar na próxima
                          vez.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid gap-3">
                        <div className="grid gap-2">
                          <label className="text-sm font-medium">Buscar franquia canônica</label>
                          <Input
                            value={franchiseSearch}
                            onChange={(e) => setFranchiseSearch(e.target.value)}
                            placeholder={ai?.franchise ? `Ex: ${ai.franchise}` : "Ex: X-Men"}
                          />
                        </div>

                        <div className="rounded-lg border bg-background/50 p-3">
                          <p className="text-sm font-medium">Sugestões</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(franchiseCandidatesQuery.data ?? []).slice(0, 12).map((f) => (
                              <Button
                                key={f.canonical}
                                type="button"
                                variant={franchiseOverride === f.canonical ? "hero" : "outline"}
                                onClick={() => setFranchiseOverride(f.canonical)}
                              >
                                {f.canonical}
                              </Button>
                            ))}
                            {(franchiseCandidatesQuery.data ?? []).length === 0 ? (
                              <span className="text-sm text-muted-foreground">
                                Nenhuma franquia encontrada — você pode digitar uma nova.
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <label className="text-sm font-medium">Franquia selecionada</label>
                          <Input
                            value={franchiseOverride}
                            onChange={(e) => setFranchiseOverride(e.target.value)}
                            placeholder="Ex: X-Men"
                          />
                          <p className="text-xs text-muted-foreground">
                            Se deixar vazio, usamos a franquia sugerida pela IA/regra.
                          </p>
                        </div>
                      </div>

                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="hero" disabled={!name.trim()}>
                            Pronto
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    onClick={() => setStatus("skipped")}
                    disabled={isSaving}
                  >
                    Pular (SHIFT+ENTER)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      skipToEnd().catch((e) =>
                        toast({
                          title: "Falha ao pular",
                          description: e instanceof Error ? e.message : "Erro inesperado",
                          variant: "destructive",
                        })
                      );
                    }}
                    disabled={isSaving}
                  >
                    Pular pro final
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStatus("review_later")}
                    disabled={isSaving}
                  >
                    Revisar depois (ESC)
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" disabled={isSaving}>
                        Rejeitar (deletar)
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deletar esta imagem?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso remove o arquivo do armazenamento e apaga o item da fila. Esta ação
                          não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.preventDefault();
                            rejectDelete();
                          }}
                          disabled={isSaving}
                        >
                          Sim, deletar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
