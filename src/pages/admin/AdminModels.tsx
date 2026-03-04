// @ts-nocheck
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useSanitizedInput } from "@/hooks/useSanitizedInput";
import { ValidationFeedback } from "@/components/ui/validation-feedback";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { FORM_RATE_LIMITS } from "@/lib/security/sanitization-config";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ModelRow = {
  id: string;
  name: string;
  franchise: string | null;
  category: string | null;
  subcategory: string | null;
  tags: string[] | null;
  image_bucket: string;
  image_path: string;
  created_at: string;
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// Componente interno sem layout (para uso em AdminModelsAndFranchises)
export function AdminModelsContent() {
  const { toast } = useToast();
  const qc = useQueryClient();
  
  // Sanitized search input
  const [searchTermRaw, setSearchTermRaw, searchTermSanitized] = useSanitizedInput("", "search");
  
  const [editingModel, setEditingModel] = useState<ModelRow | null>(null);
  
  // Sanitized edit form inputs
  const [nameRaw, setNameRaw, nameSanitized] = useSanitizedInput("", "text");
  const [franchiseRaw, setFranchiseRaw, franchiseSanitized] = useSanitizedInput("", "text");
  const [categoryRaw, setCategoryRaw, categorySanitized] = useSanitizedInput("", "text");
  const [subcategoryRaw, setSubcategoryRaw, subcategorySanitized] = useSanitizedInput("", "text");
  const [tagsRaw, setTagsRaw, tagsSanitized] = useSanitizedInput("", "text");

  const modelsQuery = useQuery({
    queryKey: ["admin-models", searchTermSanitized],
    queryFn: async () => {
      let query = supabase
        .from("models")
        .select("id,name,franchise,category,subcategory,tags,image_bucket,image_path,created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (searchTermSanitized.trim()) {
        query = query.ilike("name", `%${searchTermSanitized.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ModelRow[];
    },
  });

  const deleteModel = async (modelId: string, imageBucket: string, imagePath: string) => {
    try {
      // Deleta a imagem do storage
      const { error: storageError } = await supabase.storage.from(imageBucket).remove([imagePath]);

      if (storageError) throw storageError;

      // Deleta o modelo do banco
      const { error: dbError } = await supabase.from("models").delete().eq("id", modelId);

      if (dbError) throw dbError;

      toast({ title: "Deletado", description: "Modelo removido com sucesso." });
      qc.invalidateQueries({ queryKey: ["admin-models"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha ao deletar", description: msg, variant: "destructive" });
    }
  };

  const openEditDialog = (model: ModelRow) => {
    setEditingModel(model);
    setNameRaw(model.name);
    setFranchiseRaw(model.franchise ?? "");
    setCategoryRaw(model.category ?? "");
    setSubcategoryRaw(model.subcategory ?? "");
    setTagsRaw((model.tags ?? []).join(", "));
  };

  const saveEdit = async () => {
    if (!editingModel) return;

    // Check rate limit
    const rateLimitKey = `admin-product-update:${editingModel.id}`;
    const rateLimit = checkRateLimit(rateLimitKey, FORM_RATE_LIMITS.adminProductUpdate);

    if (!rateLimit.allowed) {
      toast({
        title: "Limite excedido",
        description: `Aguarde ${rateLimit.retryAfter}s antes de tentar novamente`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Parse and sanitize tags
      const tags = tagsSanitized
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from("models")
        .update({
          name: nameSanitized.trim(),
          franchise: franchiseSanitized.trim() || null,
          category: categorySanitized.trim() || null,
          subcategory: subcategorySanitized.trim() || null,
          tags: tags.length > 0 ? tags : null,
        })
        .eq("id", editingModel.id);

      if (error) throw error;

      toast({ title: "Atualizado", description: "Modelo editado com sucesso." });
      setEditingModel(null);
      qc.invalidateQueries({ queryKey: ["admin-models"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Falha ao editar", description: msg, variant: "destructive" });
    }
  };

  const models = modelsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="mb-12">
        <div className="h-px w-20 bg-foreground mb-6" />
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-5xl font-bold tracking-tight">Gerenciar Modelos</h1>
          <Badge variant="secondary" className="border border-border px-4 py-2 text-base">
            {models.length} {models.length === 1 ? "modelo" : "modelos"}
          </Badge>
        </div>
        <p className="text-lg text-muted-foreground">Edite ou remova modelos do catálogo Ordax.</p>
      </div>

      <Card className="border border-border bg-card shadow-premium">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xl font-semibold">Todos os Modelos</CardTitle>
            <div className="max-w-xs">
              <Input
                placeholder="Buscar por nome..."
                value={searchTermRaw}
                onChange={(e) => setSearchTermRaw(e.target.value)}
                className="h-9"
              />
              {searchTermRaw !== searchTermSanitized && (
                <ValidationFeedback
                  info="Caracteres especiais foram removidos da busca"
                  className="mt-1"
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {modelsQuery.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando modelos…</div>
          ) : models.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTermSanitized ? "Nenhum modelo encontrado." : "Nenhum modelo cadastrado."}
            </div>
          ) : (
            <div className="rounded-sm border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Preview</TableHead>
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="font-semibold">Franquia</TableHead>
                    <TableHead className="font-semibold">Categoria</TableHead>
                    <TableHead className="font-semibold">Tags</TableHead>
                    <TableHead className="font-semibold">Criado em</TableHead>
                    <TableHead className="font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model) => {
                    const imageUrl = supabase.storage
                      .from(model.image_bucket)
                      .getPublicUrl(model.image_path).data.publicUrl;

                    return (
                      <TableRow key={model.id}>
                        <TableCell>
                          <img
                            src={imageUrl}
                            alt={model.name}
                            className="h-16 w-16 object-contain rounded border border-border"
                          />
                        </TableCell>
                        <TableCell className="font-medium max-w-xs">
                          <div className="truncate" title={model.name}>
                            {model.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {model.id.slice(0, 8)}...
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{model.franchise ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          <div>{model.category ?? "—"}</div>
                          {model.subcategory && (
                            <div className="text-xs text-muted-foreground">{model.subcategory}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(model.tags ?? []).slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {(model.tags ?? []).length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{(model.tags ?? []).length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fmtDate(model.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => openEditDialog(model)}
                                >
                                  Editar
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                  <DialogTitle>Editar Modelo</DialogTitle>
                                  <DialogDescription>
                                    Atualize as informações do modelo.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-name">Nome</Label>
                                    <Input
                                      id="edit-name"
                                      value={nameRaw}
                                      onChange={(e) => setNameRaw(e.target.value)}
                                    />
                                    {nameRaw !== nameSanitized && (
                                      <ValidationFeedback
                                        info="Caracteres especiais foram removidos para segurança"
                                      />
                                    )}
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-franchise">Franquia</Label>
                                    <Input
                                      id="edit-franchise"
                                      value={franchiseRaw}
                                      onChange={(e) => setFranchiseRaw(e.target.value)}
                                    />
                                    {franchiseRaw !== franchiseSanitized && (
                                      <ValidationFeedback
                                        info="Caracteres especiais foram removidos para segurança"
                                      />
                                    )}
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-category">Categoria</Label>
                                    <Input
                                      id="edit-category"
                                      value={categoryRaw}
                                      onChange={(e) => setCategoryRaw(e.target.value)}
                                    />
                                    {categoryRaw !== categorySanitized && (
                                      <ValidationFeedback
                                        info="Caracteres especiais foram removidos para segurança"
                                      />
                                    )}
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-subcategory">Subcategoria</Label>
                                    <Input
                                      id="edit-subcategory"
                                      value={subcategoryRaw}
                                      onChange={(e) => setSubcategoryRaw(e.target.value)}
                                    />
                                    {subcategoryRaw !== subcategorySanitized && (
                                      <ValidationFeedback
                                        info="Caracteres especiais foram removidos para segurança"
                                      />
                                    )}
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="edit-tags">Tags (separadas por vírgula)</Label>
                                    <Textarea
                                      id="edit-tags"
                                      value={tagsRaw}
                                      onChange={(e) => setTagsRaw(e.target.value)}
                                      rows={3}
                                    />
                                    {tagsRaw !== tagsSanitized && (
                                      <ValidationFeedback
                                        info="Caracteres especiais foram removidos para segurança"
                                      />
                                    )}
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingModel(null)}>
                                    Cancelar
                                  </Button>
                                  <Button onClick={saveEdit}>Salvar</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs text-destructive"
                                >
                                  Deletar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Deletar modelo?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    O modelo <strong>{model.name}</strong> será removido
                                    permanentemente do catálogo e a imagem será deletada do storage.
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      deleteModel(model.id, model.image_bucket, model.image_path)
                                    }
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Sim, deletar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Componente padrão com layout (para uso standalone)
export default function AdminModels() {
  return (
    <AdminLayout>
      <AdminModelsContent />
    </AdminLayout>
  );
}
