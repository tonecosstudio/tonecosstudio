import { useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Sparkles, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

const MAX_FILES = 2000;
const MAX_DIMENSION = 1280;
const WEBP_QUALITY = 0.82;

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

async function loadImageFromFile(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; cleanup: () => void }> {
  if ("createImageBitmap" in window) {
    const bmp = await createImageBitmap(file);
    return {
      width: bmp.width,
      height: bmp.height,
      draw: (ctx, w, h) => {
        ctx.drawImage(bmp, 0, 0, w, h);
      },
      cleanup: () => {
        const anyBmp = bmp as unknown as { close?: () => void };
        anyBmp.close?.();
      },
    };
  }

  const url = await fileToDataUrl(file);
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Falha ao decodificar imagem"));
    img.src = url;
  });
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    draw: (ctx, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
    },
    cleanup: () => {
      img.src = "";
    },
  };
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) return reject(new Error("Falha ao gerar blob"));
        resolve(b);
      },
      type,
      quality,
    );
  });
}

async function optimizeImageForWeb(file: File): Promise<File> {
  const isImage = (file.type || "").toLowerCase().startsWith("image/");
  if (!isImage) return file;

  const decoded = await loadImageFromFile(file);
  try {
    const { width, height } = decoded;
    const maxSide = Math.max(width, height);
    const scale = maxSide > MAX_DIMENSION ? MAX_DIMENSION / maxSide : 1;
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));

    if (file.type === "image/webp" && scale === 1) return file;

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    decoded.draw(ctx, outW, outH);

    try {
      const blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
      return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
    } catch {
      const blob = await canvasToBlob(canvas, "image/jpeg", WEBP_QUALITY);
      return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
    }
  } finally {
    decoded.cleanup();
  }
}

function getOriginalFilenameWithFolder(file: File): string {
  // Quando o usuário escolhe uma pasta (input webkitdirectory), o browser fornece o caminho relativo.
  // Ex.: "Dragon Ball/goku_123.jpg". Isso nos permite sugerir categoria/subcategoria depois.
  const rel = String((file as any)?.webkitRelativePath ?? "").trim();
  return rel || file.name;
}

export default function UploadQueue() {
  const { toast } = useToast();
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState(0);
  const [queued, setQueued] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // AI Processing state
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedModel, setSelectedModel] = useState<"gpt-4o-mini" | "gpt-4o">("gpt-4o-mini");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ processed: 0, total: 0, failed: 0 });
  const [estimatedCost, setEstimatedCost] = useState(0);

  const setPickedFiles = (list: File[]) => {
    const onlyImages = list.filter((f) => (f.type || "").toLowerCase().startsWith("image/"));
    setFiles(onlyImages.slice(0, MAX_FILES));
    setUploaded(0);
    setQueued(0);
  };

  const progress = useMemo(() => {
    if (!files.length) return 0;
    const total = files.length * 2;
    return Math.round(((uploaded + queued) / total) * 100);
  }, [files.length, uploaded, queued]);

  // Fetch pending images count
  useEffect(() => {
    const fetchPendingCount = async () => {
      const { count, error } = await supabase
        .from("images_queue")
        .select("id", { count: "exact", head: true })
        .is("ai_suggested_name", null);

      if (!error) setPendingCount(count || 0);
    };
    fetchPendingCount();
    
    // Refresh count every 10 seconds
    const interval = setInterval(fetchPendingCount, 10000);
    return () => clearInterval(interval);
  }, [queued]);

  // Calculate estimated cost
  useEffect(() => {
    const costPerImage = selectedModel === "gpt-4o-mini" ? 0.001 : 0.002;
    setEstimatedCost(pendingCount * costPerImage);
  }, [pendingCount, selectedModel]);

  const onPick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const list = Array.from(e.target.files ?? []);
    setPickedFiles(list);
    e.currentTarget.value = "";
  };

  const onDropFiles: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    if (isRunning) return;
    const list = Array.from(e.dataTransfer.files ?? []);
    if (list.length === 0) return;
    setPickedFiles(list);
  };

  const run = async () => {
    if (!user) return;
    if (files.length === 0) return;
    setIsRunning(true);

    try {
      const bucket = "product-images";
      const uploadedRows: { storage_path: string; original_filename: string; content_type: string | null }[] = [];

      for (const f of files) {
        const optimized = await optimizeImageForWeb(f);
        const ext = optimized.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `incoming/${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, optimized, { contentType: optimized.type });
        if (error) throw error;
         uploadedRows.push({ storage_path: path, original_filename: getOriginalFilenameWithFolder(f), content_type: optimized.type || null });
        setUploaded((n) => n + 1);
      }

      const chunkSize = 200;
      for (let i = 0; i < uploadedRows.length; i += chunkSize) {
        const chunk = uploadedRows.slice(i, i + chunkSize);
        const { error } = await supabase.from("images_queue").insert(
          chunk.map((r) => ({
            created_by: user.id,
            storage_bucket: bucket,
            storage_path: r.storage_path,
            original_filename: r.original_filename,
            content_type: r.content_type,
            status: "pending" as const,
          })),
        );
        if (error) throw error;
        setQueued((n) => n + chunk.length);
      }

      toast({ title: "Fila alimentada", description: `${queued || uploadedRows.length} imagens em pending.` });
      setPendingCount((prev) => prev + uploadedRows.length);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha no upload", description: msg, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  const processWithAI = async () => {
    if (pendingCount === 0) return;
    setIsProcessing(true);
    setProcessingProgress({ processed: 0, total: pendingCount, failed: 0 });

    try {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Não autenticado");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) throw new Error("VITE_SUPABASE_URL não configurado");

      const response = await fetch(
        `${supabaseUrl}/functions/v1/process-queue-batch`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authData.session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            batch_size: Math.min(pendingCount, 50),
            model: selectedModel,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Falha ao processar");
      }

      const result = await response.json();
      
      setProcessingProgress({
        processed: result.processed || 0,
        total: result.total || 0,
        failed: result.failed || 0,
      });

      toast({
        title: "Processamento concluído",
        description: `${result.processed} imagens processadas com sucesso. Custo: $${result.totalCost?.toFixed(4) || "0.00"}`,
      });

      // Refresh pending count
       const { count, error } = await supabase
        .from("images_queue")
         .select("id", { count: "exact", head: true })
        .is("ai_suggested_name", null);
       if (!error) setPendingCount(count || 0);

    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha no processamento", description: msg, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-12">
          <div className="h-px w-20 bg-foreground mb-6" />
          <h1 className="text-5xl font-bold tracking-tight mb-4">Upload Massivo</h1>
          <p className="text-lg text-muted-foreground">
            Envie até {MAX_FILES} imagens de uma vez. As imagens serão otimizadas automaticamente.
          </p>
        </div>

        <Card className="border border-border bg-card shadow-premium">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-2xl font-semibold">Gerenciar Upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-border bg-muted/30 p-5">
              <div className="text-sm">
                <span className="text-muted-foreground">Selecionadas:</span>{" "}
                <span className="font-semibold text-foreground">{files.length}</span>
                {files.length > 0 ? (
                  <span className="ml-3 text-muted-foreground">
                    • Enviadas: <span className="font-semibold text-foreground">{uploaded}</span>
                    {" "}• Enfileiradas: <span className="font-semibold text-foreground">{queued}</span>
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  className="bg-foreground text-background hover:bg-foreground/90 font-medium" 
                  onClick={run} 
                  disabled={isRunning || files.length === 0}
                >
                  {isRunning ? "Processando…" : "Enviar"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRunning}
                  className="border-border hover:bg-muted"
                >
                  Arquivos
                </Button>
                <Button
                  variant="outline"
                  onClick={() => folderInputRef.current?.click()}
                  disabled={isRunning}
                  className="border-border hover:bg-muted"
                >
                  Pasta
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setFiles([])} 
                  disabled={isRunning}
                  className="border-border hover:bg-muted"
                >
                  Limpar
                </Button>
              </div>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onPick} disabled={isRunning} className="hidden" />
            <input
              ref={folderInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onPick}
              disabled={isRunning}
              className="hidden"
              {...({ webkitdirectory: "", directory: "" } as any)}
            />

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDropFiles}
              className="rounded-sm border-2 border-dashed border-border bg-muted/20 p-12 text-center transition-colors hover:bg-muted/30"
            >
              <p className="text-base font-medium mb-2">Arraste e solte imagens aqui</p>
              <p className="text-sm text-muted-foreground">ou use os botões "Arquivos" / "Pasta" acima</p>
            </div>

            <div className="space-y-3 rounded-sm border border-border bg-muted/30 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Selecionadas: <span className="font-semibold text-foreground">{files.length}</span>
                </span>
                <span className="text-muted-foreground">
                  Enviadas: <span className="font-semibold text-foreground">{uploaded}</span>
                  {" "}• Enfileiradas: <span className="font-semibold text-foreground">{queued}</span>
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{progress}% concluído</p>
            </div>

            <div className="rounded-sm border border-border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Otimização automática:</span> As imagens serão redimensionadas (máx. {MAX_DIMENSION}px) e convertidas para WebP com qualidade {Math.round(WEBP_QUALITY * 100)}% para melhor performance.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI Processing Card */}
        <Card className="border border-border bg-card shadow-premium mt-6">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-2xl font-semibold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Processar com IA Vision
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="rounded-sm border border-border bg-muted/30 p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Imagens Pendentes</p>
                  <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Custo Estimado</p>
                  <p className="text-2xl font-bold text-foreground">${estimatedCost.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tempo Estimado</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.ceil(pendingCount / 5)} min
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Modelo de IA
                  </label>
                  <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as "gpt-4o-mini" | "gpt-4o")} disabled={isProcessing}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o-mini">
                        GPT-4o Mini (Rápido e Econômico - $0.001/img)
                      </SelectItem>
                      <SelectItem value="gpt-4o">
                        GPT-4o (Premium - $0.002/img)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={processWithAI}
                  disabled={isProcessing || pendingCount === 0}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Processar {pendingCount} Imagens
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isProcessing && (
              <div className="space-y-3 rounded-sm border border-border bg-muted/30 p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Processadas: <span className="font-semibold text-foreground">{processingProgress.processed}</span> de {processingProgress.total}
                  </span>
                  <span className="text-muted-foreground">
                    Falhas: <span className="font-semibold text-destructive">{processingProgress.failed}</span>
                  </span>
                </div>
                <Progress 
                  value={processingProgress.total > 0 ? (processingProgress.processed / processingProgress.total) * 100 : 0} 
                  className="h-2" 
                />
                <p className="text-xs text-muted-foreground text-center">
                  {processingProgress.total > 0 
                    ? Math.round((processingProgress.processed / processingProgress.total) * 100)
                    : 0}% concluído
                </p>
              </div>
            )}

            <div className="rounded-sm border border-border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Como funciona:</span> A IA analisa cada imagem e sugere automaticamente o nome do modelo, franquia, categoria e tags. Você pode revisar e editar as sugestões no modo Conveyor antes de confirmar.
              </p>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
  );
}
