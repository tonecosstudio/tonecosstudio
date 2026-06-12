import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Database,
  Eye,
  ExternalLink,
  FileQuestion,
  FolderInput,
  GitCompare,
  ImageOff,
  ListFilter,
  PackagePlus,
  RefreshCw,
  Search,
  ShieldCheck,
  Tags,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCatalogCurationCollections,
  useCatalogCurationOverview,
  useCatalogCurationQueue,
  useCatalogImportBatches,
  useClassifyCatalogCurationImage,
  usePublishCatalogCurationItem,
  useUpdateCatalogCurationStatus,
  type CatalogCurationItem,
  type CatalogCurationStatus,
  type CatalogMediaType,
  type CatalogPriceMode,
  type CatalogVariantType,
  type CatalogVisibility,
} from "@/hooks/admin/useCatalogCuration";
import { useToast } from "@/hooks/use-toast";
import { getCatalogPublicTags } from "@/lib/catalog-utils";
import { PUBLIC_ROUTES } from "@/config/routes";

type PublishForm = {
  name: string;
  description: string;
  characterName: string;
  variantName: string;
  variantType: CatalogVariantType;
  sourceTitle: string;
  mediaType: CatalogMediaType;
  franchise: string;
  category: string;
  subcategory: string;
  tags: string;
  catalogVisibility: CatalogVisibility;
  collectionId: string;
  priceMode: CatalogPriceMode;
  priceStandaloneOverride: string;
  priceCoinsOverride: string;
};

type ReviewQuickFilter = "all" | "generic" | "visual" | "duplicate" | "ready";

const STATUS_FILTERS = [
  "all",
  "queued",
  "review",
  "approved",
  "published",
  "duplicate",
  "rejected",
  "hidden",
] as const;

const STATUS_LABELS: Record<string, string> = {
  all: "Todos",
  queued: "Fila",
  draft: "Rascunho",
  review: "Revisao",
  approved: "Aprovado",
  published: "Publicado",
  duplicate: "Duplicado",
  rejected: "Rejeitado",
  hidden: "Oculto",
};

const VISIBILITY_LABELS: Record<CatalogVisibility, string> = {
  general: "Catalogo geral",
  collection: "Somente colecao",
  both: "Catalogo e colecao",
  hidden: "Oculto",
};

const QUICK_FILTER_LABELS: Record<ReviewQuickFilter, string> = {
  all: "Todos",
  generic: "Sem nome",
  visual: "Revisao visual",
  duplicate: "Duplicidade",
  ready: "Prontos",
};

const DUPLICATE_STATUS_LABELS: Record<string, string> = {
  exact_duplicate: "imagem duplicada",
  identity_duplicate: "mesma identidade",
  source_duplicate: "mesmo Drive",
  visual_duplicate: "visual duplicado",
  needs_review: "similaridade visual",
};

const BATCH_STATUS_LABELS: Record<string, string> = {
  running: "Em andamento",
  completed: "Concluido",
  completed_with_errors: "Concluido com alertas",
  failed: "Falhou",
  dry_run: "Simulacao",
  validate_only: "Validacao",
};

function formatCount(value: number | undefined) {
  return new Intl.NumberFormat("pt-BR").format(value ?? 0);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

const EMPTY_FORM: PublishForm = {
  name: "",
  description: "",
  characterName: "",
  variantName: "",
  variantType: "default",
  sourceTitle: "",
  mediaType: "other",
  franchise: "",
  category: "",
  subcategory: "",
  tags: "",
  catalogVisibility: "hidden",
  collectionId: "none",
  priceMode: "consultation",
  priceStandaloneOverride: "",
  priceCoinsOverride: "",
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado";
}

function cleanFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getItemTags(item: CatalogCurationItem) {
  return (item.tags ?? [])
    .map((tag) => String(tag).trim().toLocaleLowerCase())
    .filter(Boolean);
}

function hasTag(item: CatalogCurationItem, tag: string) {
  return getItemTags(item).includes(tag);
}

function hasTagPrefix(item: CatalogCurationItem, prefix: string) {
  return getItemTags(item).some((tag) => tag.startsWith(prefix));
}

function isGenericImport(item: CatalogCurationItem) {
  return (
    item.name_review_status === "needs_review" ||
    hasTag(item, "generic-filename") ||
    hasTag(item, "needs-name-review")
  );
}

function needsVisualReview(item: CatalogCurationItem) {
  return (
    item.visual_review_status === "needs_review" ||
    item.duplicate_status === "needs_review" ||
    hasTag(item, "needs-visual-review")
  );
}

function isDuplicateCandidate(item: CatalogCurationItem) {
  return (
    item.status === "duplicate" ||
    Boolean(item.duplicate_status && item.duplicate_status !== "unique") ||
    hasTag(item, "duplicate-legacy") ||
    hasTag(item, "hidden-duplicate")
  );
}

function isReadyForFinalReview(item: CatalogCurationItem) {
  return (
    !isGenericImport(item) &&
    !needsVisualReview(item) &&
    !isDuplicateCandidate(item)
  );
}

function shouldShowForQuickFilter(
  item: CatalogCurationItem,
  quickFilter: ReviewQuickFilter,
) {
  if (quickFilter === "all") return true;
  if (quickFilter === "generic") return isGenericImport(item);
  if (quickFilter === "visual") return needsVisualReview(item);
  if (quickFilter === "duplicate") return isDuplicateCandidate(item);
  if (quickFilter === "ready") return isReadyForFinalReview(item);
  return true;
}

function getPublicTagLabels(item: CatalogCurationItem) {
  return getCatalogPublicTags(
    {
      name: item.proposed_name || cleanFileName(item.file_name),
      franchise: item.source_folder_name,
      category: item.category,
      subcategory: item.subcategory,
      tags: item.tags,
      character_name: item.character_name || item.proposed_name,
      source_title: item.source_title || item.source_folder_name,
      source_type: item.media_type,
    },
    8,
  );
}

function buildInitialForm(item: CatalogCurationItem | null): PublishForm {
  if (!item) return EMPTY_FORM;

  const name = item.proposed_name || cleanFileName(item.file_name);
  return {
    ...EMPTY_FORM,
    name,
    characterName: item.character_name || name.replace(/\s+\([^)]+\)$/, ""),
    variantName: item.variant_name || "",
    variantType: (item.variant_type as CatalogVariantType) || "default",
    sourceTitle: item.source_title || item.source_folder_name || "",
    mediaType: (item.media_type as CatalogMediaType) || "other",
    franchise: item.source_title || item.source_folder_name || "",
    category: item.category || "",
    subcategory: item.subcategory || "",
    tags: getPublicTagLabels(item).join(", "),
    catalogVisibility:
      (item.catalog_visibility as CatalogVisibility) || "hidden",
    collectionId: item.collection_id || "none",
  };
}

function parseOptionalMoney(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Preco invalido");
  return Math.round(parsed * 100);
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0)
    throw new Error("Coins invalidos");
  return parsed;
}

export function CatalogCurationContent() {
  const { toast } = useToast();
  const [status, setStatus] = useState("all");
  const [quickFilter, setQuickFilter] = useState<ReviewQuickFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CatalogCurationItem | null>(null);
  const [form, setForm] = useState<PublishForm>(EMPTY_FORM);

  const overviewQuery = useCatalogCurationOverview();
  const queueQuery = useCatalogCurationQueue(status);
  const collectionsQuery = useCatalogCurationCollections();
  const batchesQuery = useCatalogImportBatches();

  const items = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return (queueQuery.data ?? [])
      .filter((item) => shouldShowForQuickFilter(item, quickFilter))
      .filter((item) => {
        if (!needle) return true;
        return [
          item.file_name,
          item.proposed_name,
          item.character_name,
          item.variant_name,
          item.source_title,
          item.source_folder_name,
          item.source_file_id,
          item.status,
          item.duplicate_status,
          item.canonical_identity_key,
          ...(item.tags ?? []),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase().includes(needle));
      });
  }, [queueQuery.data, quickFilter, search]);

  const queueStats = useMemo(() => {
    const data = queueQuery.data ?? [];
    const overview = overviewQuery.data;
    return {
      total: overview?.queueTotal ?? data.length,
      published: overview?.publishedModels ?? 0,
      staging: overview?.stagingModels ?? 0,
      generic: overview?.needsNameReview ?? data.filter(isGenericImport).length,
      visual:
        overview?.needsVisualReview ?? data.filter(needsVisualReview).length,
      duplicate:
        overview?.duplicateCandidates ??
        data.filter(isDuplicateCandidate).length,
      ready:
        overview?.health.readyToPublish ??
        data.filter(isReadyForFinalReview).length,
    };
  }, [overviewQuery.data, queueQuery.data]);

  const healthChecks = useMemo(() => {
    const overview = overviewQuery.data;
    if (!overview) return [];

    return [
      {
        label: "Nomes na fila",
        count: overview.needsNameReview,
        blocking: true,
      },
      {
        label: "Revisao visual",
        count: overview.needsVisualReview,
        blocking: true,
      },
      {
        label: "Duplicidade na fila",
        count: overview.duplicateCandidates,
        blocking: true,
      },
      {
        label: "Hashes da fila",
        count: overview.health.queueMissingHashes,
        blocking: true,
      },
      {
        label: "Taxonomia publica",
        count: overview.health.publicMissingTaxonomy,
        blocking: true,
      },
      {
        label: "Imagem publica",
        count: overview.health.publicMissingImage,
        blocking: true,
      },
      {
        label: "Hashes publicos",
        count: overview.health.publicMissingHashes,
        blocking: true,
      },
      {
        label: "Tags internas publicas",
        count: overview.health.publicInternalTagRows,
        blocking: true,
      },
      {
        label: "Tags bloqueadas",
        count: overview.health.publicBlockedTagRows,
        blocking: true,
      },
      {
        label: "Duplicidade publica",
        count: overview.health.publicDuplicateCandidates,
        blocking: true,
      },
      {
        label: "Prontos para publicar",
        count: overview.health.readyToPublish,
        blocking: false,
      },
    ];
  }, [overviewQuery.data]);
  const importBatches = batchesQuery.data?.batches ?? [];
  const importBatchSchemaReady = batchesQuery.data?.schemaReady ?? false;

  useEffect(() => {
    setForm(buildInitialForm(selected));
  }, [selected]);

  const classifyMutation = useClassifyCatalogCurationImage();
  const statusMutation = useUpdateCatalogCurationStatus();
  const publishMutation = usePublishCatalogCurationItem();

  const handleClassifySuccess = (result: {
    character_name?: string;
    name?: string;
  }) => {
    toast({
      title: "Sugestao gerada",
      description: result.character_name || result.name || "Revise os dados.",
    });
  };

  const classifyItem = (queueId: string) => {
    classifyMutation.mutate(queueId, {
      onSuccess: handleClassifySuccess,
      onError: (error) => {
        toast({
          title: "Erro ao classificar",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      },
    });
  };

  const updateItemStatus = (id: string, nextStatus: CatalogCurationStatus) => {
    statusMutation.mutate(
      { id, nextStatus },
      {
        onSuccess: () => {
          toast({ title: "Status atualizado" });
        },
        onError: (error) => {
          toast({
            title: "Erro ao atualizar status",
            description: getErrorMessage(error),
            variant: "destructive",
          });
        },
      },
    );
  };

  const publishSelectedItem = () => {
    if (!selected) {
      toast({
        title: "Erro ao publicar",
        description: "Selecione um item",
        variant: "destructive",
      });
      return;
    }

    publishMutation.mutate(
      {
        queueId: selected.id,
        name: form.name,
        description: form.description,
        characterName: form.characterName,
        variantName: form.variantName,
        variantType: form.variantType,
        sourceTitle: form.sourceTitle,
        mediaType: form.mediaType,
        franchise: form.franchise,
        category: form.category,
        subcategory: form.subcategory,
        tags: form.tags,
        catalogVisibility: form.catalogVisibility,
        collectionId: form.collectionId === "none" ? null : form.collectionId,
        priceMode: form.priceMode,
        priceStandaloneOverride:
          form.priceMode === "fixed"
            ? parseOptionalMoney(form.priceStandaloneOverride)
            : null,
        priceCoinsOverride:
          form.priceMode === "fixed"
            ? parseOptionalInteger(form.priceCoinsOverride)
            : null,
      },
      {
        onSuccess: () => {
          toast({ title: "Modelo publicado" });
          setSelected(null);
        },
        onError: (error) => {
          toast({
            title: "Erro ao publicar",
            description: getErrorMessage(error),
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Importacao segura
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Database className="h-3.5 w-3.5" />
              Supabase
            </Badge>
            {overviewQuery.data?.health && (
              <Badge
                variant={
                  overviewQuery.data.health.strictPass
                    ? "outline"
                    : "destructive"
                }
                className="gap-1"
              >
                {overviewQuery.data.health.strictPass ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
                {overviewQuery.data.health.strictPass
                  ? "Saude OK"
                  : `${formatCount(
                      overviewQuery.data.health.blockingIssueCount,
                    )} pendencias`}
              </Badge>
            )}
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Modelos do catalogo
          </h2>
          <p className="text-sm text-muted-foreground">
            Revise nomes, imagens, versoes, tags, destino e preco antes de
            publicar no site.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              overviewQuery.refetch();
              queueQuery.refetch();
              batchesQuery.refetch();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <a
              href={`${PUBLIC_ROUTES.catalog}?preview=staging`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver site
            </a>
          </Button>
        </div>
      </div>

      {(overviewQuery.isError || queueQuery.isError) && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {getErrorMessage(overviewQuery.error ?? queueQuery.error)}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Curadoria
              </p>
              <p className="text-2xl font-semibold">
                {formatCount(queueStats.total)}
              </p>
            </div>
            <PackagePlus className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                No site
              </p>
              <p className="text-2xl font-semibold">
                {formatCount(queueStats.published)}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sem nome
              </p>
              <p className="text-2xl font-semibold">
                {formatCount(queueStats.generic)}
              </p>
            </div>
            <FileQuestion className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Imagem
              </p>
              <p className="text-2xl font-semibold">
                {formatCount(queueStats.visual)}
              </p>
            </div>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Duplicidade
              </p>
              <p className="text-2xl font-semibold">
                {formatCount(queueStats.duplicate)}
              </p>
            </div>
            <GitCompare className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Saude
              </p>
              <p className="text-2xl font-semibold">
                {formatCount(overviewQuery.data?.health.blockingIssueCount)}
              </p>
            </div>
            {overviewQuery.data?.health.strictPass ? (
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            )}
          </CardContent>
        </Card>
      </div>

      {overviewQuery.data?.health && !overviewQuery.data.health.strictPass && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          A curadoria tem pendencias bloqueantes. Priorize nomes, revisao
          visual, duplicidade, hashes, imagem, taxonomia, tags publicas e
          identidade dos modelos publicados antes de publicar um lote grande.
        </div>
      )}

      {healthChecks.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">Checklist de escala</h3>
              <p className="text-xs text-muted-foreground">
                Gate unico para importar, revisar e publicar sem duplicidade ou
                metadados perdidos.
              </p>
            </div>
            <Badge
              variant={
                overviewQuery.data?.health.strictPass
                  ? "outline"
                  : "destructive"
              }
              className="w-fit"
            >
              {overviewQuery.data?.health.strictPass
                ? "Aprovado"
                : `${formatCount(
                    overviewQuery.data?.health.blockingIssueCount,
                  )} bloqueios`}
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {healthChecks.map((check) => (
              <div
                key={check.label}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{check.label}</span>
                <Badge
                  variant={
                    check.blocking && check.count > 0
                      ? "destructive"
                      : check.blocking
                        ? "outline"
                        : "secondary"
                  }
                >
                  {formatCount(check.count)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              <FolderInput className="h-4 w-4 text-muted-foreground" />
              Lotes de importacao
            </h3>
            <p className="text-xs text-muted-foreground">
              Auditoria dos manifestos processados: origem, totais, falhas e
              atualizacoes.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            {formatCount(importBatches.length)} recentes
          </Badge>
        </div>

        {batchesQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Carregando lotes...</p>
        )}

        {batchesQuery.isError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {getErrorMessage(batchesQuery.error)}
          </div>
        )}

        {batchesQuery.data?.schemaReady === false && (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            O controle de lotes ja esta preparado no codigo. Aplique a migration
            catalog_import_batches para ativar a auditoria operacional no admin.
          </div>
        )}

        {importBatchSchemaReady && importBatches.length === 0 && (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Nenhum lote registrado ainda. O proximo import via manifesto vai
            abrir um lote auditavel automaticamente.
          </div>
        )}

        {importBatchSchemaReady && importBatches.length > 0 && (
          <div className="grid gap-2 lg:grid-cols-2">
            {importBatches.map((batch) => (
              <div
                key={batch.id}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {batch.source_folder_name ||
                        batch.source_title ||
                        batch.import_slug}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {batch.source_drive_path ||
                        batch.manifest_path ||
                        "origem nao definida"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      batch.status === "failed" ||
                      batch.status === "completed_with_errors"
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {BATCH_STATUS_LABELS[batch.status] || batch.status}
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Validos</span>
                    <p className="font-medium">
                      {formatCount(batch.valid_count)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Novos</span>
                    <p className="font-medium">
                      {formatCount(batch.imported_count)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Atualizados</span>
                    <p className="font-medium">
                      {formatCount(batch.updated_count)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Falhas</span>
                    <p className="font-medium">
                      {formatCount(batch.failed_count + batch.rejected_count)}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Inicio {formatDateTime(batch.started_at)}
                  {batch.finished_at
                    ? ` | fim ${formatDateTime(batch.finished_at)}`
                    : ""}
                </p>
                {batch.error_message && (
                  <p className="mt-2 text-xs text-destructive">
                    {batch.error_message}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(430px,0.85fr)]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold">Fila de modelos</h3>
                <p className="text-xs text-muted-foreground">
                  {formatCount(items.length)} itens nesta visao.{" "}
                  {formatCount(queueStats.staging)} modelos ainda estao em
                  staging tecnico.
                </p>
              </div>
              <Badge variant="outline" className="w-fit gap-1">
                <ListFilter className="h-3.5 w-3.5" />
                {STATUS_LABELS[status] || status}
              </Badge>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Buscar por arquivo, personagem, versao ou origem"
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setSelected(null);
                }}
              >
                <SelectTrigger className="sm:w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((statusValue) => (
                    <SelectItem key={statusValue} value={statusValue}>
                      {STATUS_LABELS[statusValue]} (
                      {formatCount(
                        overviewQuery.data?.queueByStatus[statusValue],
                      )}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(QUICK_FILTER_LABELS) as ReviewQuickFilter[]).map(
                (filter) => (
                  <Button
                    key={filter}
                    type="button"
                    size="sm"
                    variant={quickFilter === filter ? "default" : "outline"}
                    onClick={() => setQuickFilter(filter)}
                  >
                    {filter === "generic" && (
                      <FileQuestion className="mr-1 h-3.5 w-3.5" />
                    )}
                    {filter === "visual" && (
                      <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                    )}
                    {filter === "duplicate" && (
                      <GitCompare className="mr-1 h-3.5 w-3.5" />
                    )}
                    {filter === "ready" && (
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    )}
                    {QUICK_FILTER_LABELS[filter]}
                  </Button>
                ),
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {queueQuery.isLoading && (
              <p className="text-sm text-muted-foreground">
                Carregando fila...
              </p>
            )}
            {queueQuery.isError && (
              <div className="col-span-full rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
                {getErrorMessage(queueQuery.error)}
              </div>
            )}
            {items.map((item) => (
              <Card
                key={item.id}
                className={`cursor-pointer transition-colors ${selected?.id === item.id ? "border-primary" : ""}`}
                onClick={() => setSelected(item)}
              >
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <div className="h-24 w-20 shrink-0 overflow-hidden rounded bg-muted">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.file_name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageOff className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p className="truncate text-sm font-medium">
                          {item.character_name ||
                            item.proposed_name ||
                            item.file_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[
                            item.variant_name,
                            item.source_title || item.source_folder_name,
                          ]
                            .filter(Boolean)
                            .join(" | ") || item.file_name}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {STATUS_LABELS[item.status] || item.status}
                        </Badge>
                        <Badge variant="outline">
                          {VISIBILITY_LABELS[
                            item.catalog_visibility as CatalogVisibility
                          ] || item.catalog_visibility}
                        </Badge>
                        {item.confidence !== null && (
                          <Badge variant="outline">
                            {Math.round(item.confidence * 100)}% IA
                          </Badge>
                        )}
                        {isGenericImport(item) && (
                          <Badge variant="outline">sem nome</Badge>
                        )}
                        {needsVisualReview(item) && (
                          <Badge variant="destructive">revisar imagem</Badge>
                        )}
                        {isDuplicateCandidate(item) && (
                          <Badge variant="destructive">duplicidade</Badge>
                        )}
                        {item.image_width && item.image_height && (
                          <Badge variant="outline">
                            {item.image_width}x{item.image_height}
                          </Badge>
                        )}
                      </div>
                      {getPublicTagLabels(item).length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium uppercase text-muted-foreground">
                            Tags publicas
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {getPublicTagLabels(item).map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="gap-1 text-[10px]"
                              >
                                <Tags className="h-3 w-3" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            classifyItem(item.id);
                          }}
                          disabled={classifyMutation.isPending}
                        >
                          <Bot className="mr-1 h-3 w-3" />
                          Analisar imagem
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(item);
                          }}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          Editar e publicar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!queueQuery.isLoading &&
              !queueQuery.isError &&
              items.length === 0 && (
                <div className="col-span-full rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                  <p>Nenhum item encontrado neste filtro.</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatus("all");
                        setQuickFilter("all");
                        setSearch("");
                      }}
                    >
                      Ver todos
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuickFilter("generic")}
                    >
                      Priorizar sem nome
                    </Button>
                  </div>
                </div>
              )}
          </div>
        </div>

        <Card className="h-fit xl:sticky xl:top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5" />
              Publicar modelo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="space-y-4">
                <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
                  Selecione um modelo da fila para revisar nome, imagem, tags,
                  destino e preco.
                </div>
                <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                  <strong className="font-medium text-foreground">
                    Organizacao:
                  </strong>{" "}
                  tags publicas usam personagem, obra e categoria pesquisavel.
                  Status, confianca da IA, resolucao, duplicidade e origem ficam
                  como metadados internos do admin.
                </div>
                <div className="grid gap-2 text-sm">
                  <button
                    type="button"
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted"
                    onClick={() => setQuickFilter("generic")}
                  >
                    <span>Arquivos sem nome</span>
                    <Badge variant="outline">
                      {formatCount(queueStats.generic)}
                    </Badge>
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted"
                    onClick={() => setQuickFilter("visual")}
                  >
                    <span>Revisao de imagem</span>
                    <Badge variant="outline">
                      {formatCount(queueStats.visual)}
                    </Badge>
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted"
                    onClick={() => setQuickFilter("duplicate")}
                  >
                    <span>Candidatos duplicados</span>
                    <Badge variant="outline">
                      {formatCount(queueStats.duplicate)}
                    </Badge>
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted"
                    onClick={() => setQuickFilter("ready")}
                  >
                    <span>Prontos para publicar</span>
                    <Badge variant="outline">
                      {formatCount(queueStats.ready)}
                    </Badge>
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  publishSelectedItem();
                }}
              >
                {selected.image_url && (
                  <img
                    src={selected.image_url}
                    alt={selected.file_name}
                    className="max-h-72 w-full rounded bg-muted object-contain"
                  />
                )}

                <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <div className="grid gap-1 sm:grid-cols-2">
                    <div>
                      <span className="font-medium text-foreground">
                        Arquivo:{" "}
                      </span>
                      {selected.file_name}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Drive ID:{" "}
                      </span>
                      {selected.source_file_id || "sem id"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Origem:{" "}
                      </span>
                      {selected.source_drive_path ||
                        selected.source_folder_name ||
                        "nao definida"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Status:{" "}
                      </span>
                      {STATUS_LABELS[selected.status] || selected.status}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Dedupe:{" "}
                      </span>
                      {selected.duplicate_status &&
                      selected.duplicate_status !== "unique"
                        ? DUPLICATE_STATUS_LABELS[selected.duplicate_status] ||
                          selected.duplicate_status
                        : "unico"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">
                        Imagem:{" "}
                      </span>
                      {selected.image_width && selected.image_height
                        ? `${selected.image_width}x${selected.image_height}${selected.image_format ? ` ${selected.image_format}` : ""}`
                        : "sem metadados"}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-medium text-foreground">
                        Chave:{" "}
                      </span>
                      {selected.canonical_identity_key || "sem chave"}
                    </div>
                  </div>
                  {selected.notes && <p>{selected.notes}</p>}
                  {selected.analysis_notes && <p>{selected.analysis_notes}</p>}
                  {(isGenericImport(selected) ||
                    needsVisualReview(selected) ||
                    isDuplicateCandidate(selected)) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {isGenericImport(selected) && (
                        <Badge variant="outline">Arquivo sem nome</Badge>
                      )}
                      {needsVisualReview(selected) && (
                        <Badge variant="destructive">
                          Confirmar imagem x nome
                        </Badge>
                      )}
                      {isDuplicateCandidate(selected) && (
                        <Badge variant="destructive">Candidato duplicado</Badge>
                      )}
                      {hasTagPrefix(selected, "drive-id-") && (
                        <Badge variant="outline">Origem rastreada</Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Nome publicado</Label>
                    <Input
                      value={form.name}
                      onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Personagem</Label>
                    <Input
                      value={form.characterName}
                      onChange={(event) =>
                        setForm({ ...form, characterName: event.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Versao</Label>
                    <Input
                      value={form.variantName}
                      onChange={(event) =>
                        setForm({ ...form, variantName: event.target.value })
                      }
                      placeholder="Ex: Super Saiyan 3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de versao</Label>
                    <Select
                      value={form.variantType}
                      onValueChange={(value) =>
                        setForm({
                          ...form,
                          variantType: value as CatalogVariantType,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Padrao</SelectItem>
                        <SelectItem value="form">Forma</SelectItem>
                        <SelectItem value="costume">Roupa</SelectItem>
                        <SelectItem value="pose">Pose</SelectItem>
                        <SelectItem value="scale">Escala</SelectItem>
                        <SelectItem value="edition">Edicao</SelectItem>
                        <SelectItem value="variant">Variante</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Obra/franquia</Label>
                    <Input
                      value={form.sourceTitle}
                      onChange={(event) =>
                        setForm({ ...form, sourceTitle: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de midia</Label>
                    <Select
                      value={form.mediaType}
                      onValueChange={(value) =>
                        setForm({
                          ...form,
                          mediaType: value as CatalogMediaType,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anime">Anime</SelectItem>
                        <SelectItem value="manga">Manga</SelectItem>
                        <SelectItem value="movie">Filme</SelectItem>
                        <SelectItem value="series">Serie</SelectItem>
                        <SelectItem value="game">Game</SelectItem>
                        <SelectItem value="comic">Comic</SelectItem>
                        <SelectItem value="tokusatsu">Tokusatsu</SelectItem>
                        <SelectItem value="original">Original</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Destino</Label>
                    <Select
                      value={form.catalogVisibility}
                      onValueChange={(value) =>
                        setForm({
                          ...form,
                          catalogVisibility: value as CatalogVisibility,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Catalogo geral</SelectItem>
                        <SelectItem value="collection">
                          Somente colecao
                        </SelectItem>
                        <SelectItem value="both">Catalogo e colecao</SelectItem>
                        <SelectItem value="hidden">Oculto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Colecao</Label>
                    <Select
                      value={form.collectionId}
                      onValueChange={(value) =>
                        setForm({ ...form, collectionId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem colecao</SelectItem>
                        {(collectionsQuery.data ?? []).map((collection) => (
                          <SelectItem key={collection.id} value={collection.id}>
                            {collection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Input
                      value={form.category}
                      onChange={(event) =>
                        setForm({ ...form, category: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subcategoria</Label>
                    <Input
                      value={form.subcategory}
                      onChange={(event) =>
                        setForm({ ...form, subcategory: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Tags publicas</Label>
                    <Input
                      value={form.tags}
                      onChange={(event) =>
                        setForm({ ...form, tags: event.target.value })
                      }
                      placeholder="dragon ball z, zarbon, anime"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use somente tags que devem aparecer no site e servir para
                      filtro. Metadados internos nao entram aqui.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descricao</Label>
                  <Textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Preco</Label>
                    <Select
                      value={form.priceMode}
                      onValueChange={(value) =>
                        setForm({
                          ...form,
                          priceMode: value as CatalogPriceMode,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">
                          Sob consulta
                        </SelectItem>
                        <SelectItem value="category">Por categoria</SelectItem>
                        <SelectItem value="fixed">Fixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Avulso R$</Label>
                    <Input
                      value={form.priceStandaloneOverride}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          priceStandaloneOverride: event.target.value,
                        })
                      }
                      disabled={form.priceMode !== "fixed"}
                      placeholder="350,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Coins</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.priceCoinsOverride}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          priceCoinsOverride: event.target.value,
                        })
                      }
                      disabled={form.priceMode !== "fixed"}
                      placeholder="300"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-between gap-2 pt-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => updateItemStatus(selected.id, "review")}
                    >
                      Revisar depois
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => updateItemStatus(selected.id, "duplicate")}
                    >
                      Duplicado
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => updateItemStatus(selected.id, "rejected")}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Rejeitar
                    </Button>
                  </div>
                  <Button type="submit" disabled={publishMutation.isPending}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Publicar
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
