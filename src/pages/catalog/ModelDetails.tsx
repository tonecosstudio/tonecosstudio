/**
 * Model Details Page - Metal Slug Style
 *
 * Página interna do modelo com estética arcade
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { Page } from "@/components/layouts/Page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportModelNameDialog } from "@/components/catalog/ReportModelNameDialog";
import {
  ArrowLeft,
  Heart,
  Package,
  Crown,
  Tag,
  Layers,
  Coins,
  MessageCircle,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { likeModel, unlikeModel } from "@/lib/model-likes";
import { useLikedModelIdsQuery } from "@/pages/catalog/hooks/useLikedModelIdsQuery";
import {
  buildModelTitle,
  getCatalogPublicTags,
  getCatalogSensitivity,
  normalizeCatalogTag,
} from "@/lib/catalog-utils";
import { useModelDetails } from "@/hooks/catalog/useModelDetails";
import {
  PUBLIC_ROUTES,
  catalogCharacterPath,
  catalogModelDetailsPath,
  resolveCatalogModelIdFromParam,
} from "@/config/routes";
import { formatCurrency } from "@/lib/utils";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  anime: "Anime",
  manga: "Manga",
  movie: "Filme",
  series: "Serie",
  game: "Game",
  comic: "HQ",
  tokusatsu: "Tokusatsu",
  original: "Original",
  other: "Outro",
};

const VARIANT_TYPE_LABELS: Record<string, string> = {
  default: "Padrao",
  form: "Forma",
  costume: "Roupa",
  pose: "Pose",
  scale: "Escala",
  edition: "Edicao",
  variant: "Versao",
  other: "Outro",
};

// ─── Types ───────────────────────────────────────────────────
function catalogFilterPath(
  key: "tag" | "franchise" | "character",
  value: string,
) {
  const params = new URLSearchParams();
  params.set(key, key === "tag" ? normalizeCatalogTag(value) : value);
  return `${PUBLIC_ROUTES.catalog}?${params.toString()}`;
}

type ModelGalleryItem = {
  key: string;
  imageUrl: string;
  thumbnailUrl: string;
  altText: string;
  sensitivity: ReturnType<typeof getCatalogSensitivity>;
};

function uniqueGalleryItems(items: ModelGalleryItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.imageUrl)) return false;
    seen.add(item.imageUrl);
    return true;
  });
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values.filter((value): value is string => {
    if (!value) return false;
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeDescriptionText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getUsefulDescription(
  description: string | null | undefined,
  context: Array<string | null | undefined>,
) {
  if (!description) return null;

  const trimmed = description.trim();
  if (trimmed.length < 24) return null;

  const normalizedDescription = normalizeDescriptionText(trimmed);
  if (!normalizedDescription) return null;

  const normalizedContext = uniqueStrings(context)
    .map((value) => normalizeDescriptionText(value))
    .filter(Boolean);

  if (normalizedContext.some((value) => normalizedDescription === value)) {
    return null;
  }

  return trimmed;
}

function ModelGalleryStrip({
  images,
  activeImageUrl,
  label,
  onSelect,
}: {
  images: ModelGalleryItem[];
  activeImageUrl: string | null;
  label: string;
  onSelect: (image: ModelGalleryItem) => void;
}) {
  if (images.length <= 1) return null;

  return (
    <section className="mt-4 border border-[hsl(var(--gold-accent)/0.18)] bg-[hsl(var(--card)/0.7)] p-3">
      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[hsl(var(--gold-accent))]">
        Galeria
      </h2>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {images.map((image, index) => {
          const isActive = image.imageUrl === activeImageUrl;

          return (
            <button
              key={image.key}
              type="button"
              onClick={() => onSelect(image)}
              className={`aspect-square overflow-hidden border bg-[hsl(var(--background))] transition-all ${
                isActive
                  ? "border-[hsl(var(--gold-accent))] shadow-[0_0_18px_hsl(var(--gold-accent)/0.25)]"
                  : "border-[hsl(var(--gold-accent)/0.2)] opacity-70 hover:opacity-100"
              }`}
              aria-label={`Ver foto ${index + 1} de ${label}`}
            >
              <span className="relative block h-full w-full">
                <img
                  src={image.thumbnailUrl}
                  alt={image.altText || `${label} - foto ${index + 1}`}
                  className={`h-full w-full object-cover ${
                    image.sensitivity.shouldBlur ? "scale-105 blur-md" : ""
                  }`}
                  loading="lazy"
                  decoding="async"
                />
                {image.sensitivity.shouldBlur && (
                  <span className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--background)/0.52)]">
                    <EyeOff className="h-4 w-4 text-[hsl(var(--gold-accent))]" />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function ModelDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const modelId = id ? resolveCatalogModelIdFromParam(id) : undefined;

  // ─── Fetch model ────────────────────────────────────────────
  const { data: model, isLoading } = useModelDetails(modelId);

  // ─── Likes ──────────────────────────────────────────────────
  const likesQuery = useLikedModelIdsQuery(user?.id);
  const likedIds = likesQuery.data ?? new Set<string>();
  const isLiked =
    Boolean(user?.id) && Boolean(model?.id) && likedIds.has(model?.id ?? "");

  const onToggleLike = async () => {
    if (!model) return;
    if (!user?.id) {
      toast({
        title: "Entre para favoritar",
        description: "Faça login para salvar seus modelos preferidos.",
      });
      navigate(PUBLIC_ROUTES.login);
      return;
    }
    try {
      if (isLiked) await unlikeModel(user.id, model.id);
      else await likeModel(user.id, model.id);
      await likesQuery.refetch();
    } catch {
      toast({
        title: "Não foi possível salvar o favorito",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  // ─── Derived ────────────────────────────────────────────────
  const displayName = model?.character_name || model?.name || "Modelo";
  const sourceTitle = model?.source_title || model?.franchise || null;
  const variantName = model?.variant_name || null;
  const mediaLabel = model?.source_type
    ? SOURCE_TYPE_LABELS[model.source_type] || model.source_type
    : null;
  const variantLabel = model?.variant_type
    ? VARIANT_TYPE_LABELS[model.variant_type] || model.variant_type
    : null;
  const title = model
    ? variantName
      ? `${displayName} - ${variantName}`
      : buildModelTitle(displayName, sourceTitle)
    : "Modelo";
  const seoDescription = model
    ? `Veja detalhes do modelo ${title}. Estatueta artesanal da Tonecos Studios.`
    : "Veja detalhes do modelo. Estatueta artesanal da Tonecos Studios.";
  const headlineTitle = displayName;
  const subtitleParts = uniqueStrings([
    sourceTitle,
    variantName,
    mediaLabel && mediaLabel !== sourceTitle ? mediaLabel : null,
  ]);

  const galleryItems = useMemo(() => {
    if (!model) return [];

    const items: ModelGalleryItem[] = [];
    if (model.imageUrl) {
      items.push({
        key: `primary:${model.id}`,
        imageUrl: model.imageUrl,
        thumbnailUrl: model.thumbnailUrl ?? model.imageUrl,
        altText: displayName,
        sensitivity: getCatalogSensitivity(model),
      });
    }

    for (const image of model.galleryImages ?? []) {
      if (!image.imageUrl) continue;
      items.push({
        key: image.id,
        imageUrl: image.imageUrl,
        thumbnailUrl: image.thumbnailUrl ?? image.imageUrl,
        altText: image.alt_text ?? displayName,
        sensitivity: getCatalogSensitivity(image),
      });
    }

    return uniqueGalleryItems(items);
  }, [displayName, model]);
  const imageUrl =
    selectedImage &&
    galleryItems.some((item) => item.imageUrl === selectedImage)
      ? selectedImage
      : (galleryItems[0]?.imageUrl ?? null);
  const activeGalleryItem =
    galleryItems.find((item) => item.imageUrl === imageUrl) ??
    galleryItems[0] ??
    null;

  const metaChips = useMemo(
    () =>
      uniqueStrings([
        sourceTitle,
        mediaLabel,
        model?.category,
        model?.subcategory,
      ]).map((value) => ({
        label: "Tag",
        value,
        href: catalogFilterPath("tag", value),
      })),
    [mediaLabel, model?.category, model?.subcategory, sourceTitle],
  );

  const hiddenTagKeys = useMemo(
    () =>
      new Set(
        uniqueStrings([
          displayName,
          sourceTitle,
          mediaLabel,
          model?.category,
          model?.subcategory,
          variantName,
        ]).map((value) => normalizeCatalogTag(value)),
      ),
    [
      displayName,
      mediaLabel,
      model?.category,
      model?.subcategory,
      sourceTitle,
      variantName,
    ],
  );
  const tags = useMemo(
    () =>
      uniqueStrings(getCatalogPublicTags(model, 12))
        .filter((tag) => !hiddenTagKeys.has(normalizeCatalogTag(tag)))
        .slice(0, 4),
    [hiddenTagKeys, model],
  );
  const usefulDescription = useMemo(
    () =>
      getUsefulDescription(model?.description, [
        displayName,
        sourceTitle,
        variantName,
        mediaLabel,
        model?.category,
        model?.subcategory,
        title,
      ]),
    [
      displayName,
      mediaLabel,
      model?.category,
      model?.description,
      model?.subcategory,
      sourceTitle,
      title,
      variantName,
    ],
  );
  const sensitivity =
    activeGalleryItem?.sensitivity ?? getCatalogSensitivity(model);
  const detailsPath = model?.id
    ? catalogModelDetailsPath(
        model.id,
        [model.character_name || model.name, model.variant_name]
          .filter(Boolean)
          .join(" "),
      )
    : PUBLIC_ROUTES.catalog;
  const characterPath =
    model?.character_name
      ? catalogCharacterPath(model.character_name, sourceTitle)
      : PUBLIC_ROUTES.catalog;
  const taxonomyRows = [
    model?.character_name
      ? {
          label: "Personagem",
          value: model.character_name,
          href: catalogFilterPath("character", model.character_name),
        }
      : null,
    sourceTitle
      ? {
          label: "Obra",
          value: sourceTitle,
          href: catalogFilterPath("tag", sourceTitle),
        }
      : null,
  ].filter((row): row is { label: string; value: string; href?: string } =>
    Boolean(row?.value),
  );
  const fixedCashPrice =
    model?.price_mode === "fixed" &&
    typeof model.price_standalone_override === "number" &&
    model.price_standalone_override > 0
      ? model.price_standalone_override
      : null;
  const hasFixedCoinPrice =
    model?.price_mode === "fixed" &&
    typeof model.price_coins_override === "number" &&
    model.price_coins_override > 0;

  useEffect(() => {
    if (!model?.id) return;
    if (!detailsPath || detailsPath === location.pathname) return;
    navigate(detailsPath, { replace: true });
  }, [detailsPath, location.pathname, model?.id, navigate]);

  // ─── Loading ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Page
        title="Carregando..."
        description="Carregando informações do modelo"
      >
        <div className="min-h-screen bg-[hsl(var(--background))] py-12">
          <div className="container max-w-6xl mx-auto px-4">
            <Skeleton className="h-12 w-48 mb-8" />
            <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
              <Skeleton className="aspect-[3/4] w-full rounded-lg" />
              <div className="space-y-4">
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </div>
        </div>
      </Page>
    );
  }

  // ─── Not Found ──────────────────────────────────────────────
  if (!model) {
    return (
      <Page
        title="Modelo não encontrado"
        description="O modelo solicitado não foi encontrado"
      >
        <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
          <div className="text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--muted-foreground))]" />
            <h1 className="text-2xl font-bold mb-4 font-mono uppercase tracking-wider">
              Modelo não encontrado
            </h1>
            <Button
              onClick={() => navigate(PUBLIC_ROUTES.catalog)}
              className="bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--gold-accent)/0.9)] font-mono uppercase tracking-wider text-sm"
            >
              Voltar ao Universo
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  // ─── Render ─────────────────────────────────────────────────
  return (
    <Page
      title={title}
      description={seoDescription}
      keywords={["modelo", "catálogo", displayName]}
    >
      {/* Scanlines Effect */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground)) 2px, hsl(var(--foreground)) 4px)",
          }}
        />
      </div>

      <div className="min-h-screen bg-[#080808] bg-[radial-gradient(circle_at_top,rgba(245,179,1,0.08),transparent_32%),linear-gradient(180deg,#090909_0%,#050505_100%)] py-8 text-[hsl(var(--foreground))] md:py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => navigate(characterPath)}
              className="inline-flex border border-[hsl(var(--gold-accent)/0.45)] bg-[#111111] font-mono text-xs uppercase tracking-wider text-[hsl(var(--gold-accent))] shadow-[0_0_16px_hsl(var(--gold-accent)/0.12)] hover:bg-[hsl(var(--gold-accent)/0.12)] hover:text-[hsl(var(--gold-accent))]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {model?.character_name ? "Voltar ao Personagem" : "Voltar ao Universo"}
            </Button>
            <button
              type="button"
              onClick={() => navigate(PUBLIC_ROUTES.catalog)}
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-[hsl(0,0%,58%)] transition-colors hover:text-[hsl(var(--gold-accent))]"
            >
              Universo
            </button>
            {model?.character_name && (
              <>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[hsl(0,0%,28%)]">
                  /
                </span>
                <button
                  type="button"
                  onClick={() => navigate(characterPath)}
                  className="font-mono text-[10px] uppercase tracking-[0.22em] text-[hsl(0,0%,58%)] transition-colors hover:text-[hsl(var(--gold-accent))]"
                >
                  {model.character_name}
                </button>
              </>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
            {/* Image Section */}
            <div className="relative">
              <div
                className="relative overflow-hidden rounded-sm border-2 border-[hsl(var(--gold-accent))] shadow-[0_0_40px_hsl(var(--gold-accent)/0.3)]"
                style={{
                  clipPath: "polygon(0 0, 100% 0, 100% 92%, 90% 100%, 0 100%)",
                }}
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#0b0b0b]">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={displayName}
                      className={`h-full w-full object-contain p-4 ${
                        sensitivity.shouldBlur ? "scale-[1.03] blur-xl" : ""
                      }`}
                      loading="eager"
                      fetchPriority="high"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[hsl(var(--gold-accent)/0.2)] to-[#080808]">
                      <Package className="w-32 h-32 text-[hsl(var(--gold-accent))]" />
                    </div>
                  )}

                  {sensitivity.shouldBlur && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#080808]/70 px-6 text-center backdrop-blur-sm">
                      <div className="border border-[hsl(var(--gold-accent)/0.45)] bg-[#111111]/95 px-4 py-3 font-mono uppercase tracking-wider text-[hsl(var(--gold-accent))] shadow-[0_0_24px_hsl(var(--gold-accent)/0.18)]">
                        <div className="mb-1 flex items-center justify-center gap-2 text-xs font-bold">
                          <EyeOff className="h-4 w-4" />
                          {sensitivity.label}
                        </div>
                        <p className="max-w-xs text-[10px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                          Imagem borrada por classificacao de conteudo.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Scanlines */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-[0.05]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--foreground)) 2px, hsl(var(--foreground)) 4px)",
                    }}
                  />
                </div>

                {/* Corner Accents */}
                <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[hsl(var(--gold-accent))]" />
                <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[hsl(var(--gold-accent))]" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[hsl(var(--gold-accent))]" />
              </div>

              <p className="mt-3 border-l-2 border-[hsl(var(--gold-accent)/0.45)] pl-3 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Imagem de referencia
                {sourceTitle ? ` - ${sourceTitle}` : ""}.
              </p>

              <ModelGalleryStrip
                images={galleryItems}
                activeImageUrl={imageUrl}
                label={title}
                onSelect={(image) => setSelectedImage(image.imageUrl)}
              />

              {/* Like Button */}
              <button
                type="button"
                className="absolute right-4 top-4 z-20 inline-flex h-12 w-12 items-center justify-center rounded-sm border-2 border-[hsl(var(--gold-accent))] bg-[#111111]/95 text-[hsl(var(--gold-accent))] shadow-[0_0_15px_hsl(var(--gold-accent)/0.3)] backdrop-blur-sm transition-all duration-300 hover:bg-[hsl(var(--gold-accent)/0.2)] hover:shadow-[0_0_25px_hsl(var(--gold-accent)/0.5)]"
                onClick={onToggleLike}
                aria-pressed={isLiked}
                aria-label={
                  isLiked ? "Remover dos favoritos" : "Adicionar aos favoritos"
                }
              >
                <Heart
                  className={`h-5 w-5 transition-colors duration-300 ${
                    isLiked
                      ? "fill-[hsl(var(--gold-accent))] text-[hsl(var(--gold-accent))]"
                      : "text-[hsl(var(--foreground))]"
                  }`}
                />
              </button>
            </div>

            {/* Info Section */}
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] font-mono uppercase tracking-wider px-3 py-1 text-xs border-2 border-[hsl(var(--foreground))]">
                    <Crown className="w-3 h-3 mr-1" />
                    Universo
                  </Badge>
                  {model.category && (
                    <Badge
                      variant="outline"
                      className="font-mono uppercase tracking-wider px-3 py-1 text-xs border-[hsl(var(--gold-accent))]"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {model.category}
                    </Badge>
                  )}
                </div>

                <h1 className="mb-2 font-mono text-3xl font-bold uppercase tracking-tight text-[hsl(var(--gold-accent))] drop-shadow-[0_0_10px_hsl(var(--gold-accent))] md:text-5xl">
                  {headlineTitle}
                </h1>
                {subtitleParts.length > 0 && (
                  <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">
                    {subtitleParts.join(" • ")}
                  </p>
                )}

                {metaChips.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {metaChips.map((chip) =>
                      chip.href ? (
                        <Link
                          key={`${chip.label}-${chip.value}`}
                          to={chip.href}
                          className="inline-flex items-center gap-1.5 border border-[hsl(var(--gold-accent)/0.35)] bg-[hsl(var(--gold-accent)/0.08)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(var(--gold-accent)/0.14)]"
                        >
                          <Tag className="h-3 w-3" />
                          {chip.value}
                        </Link>
                      ) : (
                        <span
                          key={`${chip.label}-${chip.value}`}
                          className="inline-flex items-center border border-[hsl(var(--gold-accent)/0.18)] bg-[#101010] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]"
                        >
                          {chip.value}
                        </span>
                      ),
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              {usefulDescription && (
                <div className="rounded-sm border border-[hsl(var(--gold-accent)/0.18)] bg-[#101010] p-4">
                  <p className="text-[hsl(var(--muted-foreground))] text-sm leading-relaxed">
                    {usefulDescription}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <ReportModelNameDialog
                  modelId={model.id}
                  displayedName={displayName}
                  sourceTitle={sourceTitle}
                  detailPath={detailsPath}
                  triggerLabel="Corrigir nome"
                  triggerVariant="outline"
                  triggerClassName="border-[hsl(var(--gold-accent)/0.35)] bg-[hsl(var(--gold-accent)/0.06)] font-mono uppercase tracking-wider text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.12)]"
                />
              </div>

              {taxonomyRows.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-2 border border-[hsl(var(--gold-accent)/0.16)] bg-[#101010] px-4 py-3">
                  {taxonomyRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex min-w-0 items-baseline gap-2 text-sm"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        {row.label}
                      </span>
                      {row.href ? (
                        <Link
                          to={row.href}
                          className="truncate font-semibold text-[hsl(var(--gold-accent))] underline-offset-2 hover:underline"
                          title={String(row.value)}
                        >
                          {row.value}
                        </Link>
                      ) : (
                        <span
                          className="truncate font-semibold text-[hsl(var(--foreground))]"
                          title={String(row.value)}
                        >
                          {row.value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                    <Layers className="w-3 h-3" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.slice(0, 14).map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="border-[hsl(var(--gold-accent)/0.18)] bg-[#101010] p-0 font-mono text-xs uppercase tracking-wider text-[hsl(var(--foreground))] transition-colors duration-300 hover:border-[hsl(var(--gold-accent))]"
                      >
                        <Link
                          to={catalogFilterPath("tag", t)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5"
                          aria-label={`Filtrar tag ${t}`}
                        >
                          <Tag className="h-3 w-3" />
                          {t}
                        </Link>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Card */}
              <div className="rounded-sm border-2 border-[hsl(var(--gold-accent)/0.3)] bg-[#101010] p-5">
                <h3 className="mb-3 font-mono text-sm font-bold uppercase tracking-wider text-[hsl(var(--gold-accent))]">
                  Sob encomenda
                </h3>
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  {hasFixedCoinPrice && (
                    <div className="border border-[hsl(var(--gold-accent)/0.25)] bg-[hsl(var(--gold-accent)/0.08)] p-3">
                      <p className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        <Coins className="h-3 w-3" />
                        Coins
                      </p>
                      <p className="text-2xl font-bold text-[hsl(var(--gold-accent))]">
                        {model.price_coins_override}
                      </p>
                    </div>
                  )}
                  {fixedCashPrice !== null ? (
                    <div className="border border-[hsl(var(--gold-accent)/0.16)] bg-[#0d0d0d] p-3">
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Avulso
                      </p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(fixedCashPrice / 100)}
                      </p>
                    </div>
                  ) : (
                    <div className="border border-[hsl(var(--gold-accent)/0.16)] bg-[#0d0d0d] p-3 sm:col-span-2">
                      <p className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        <MessageCircle className="h-3 w-3" />
                        Preco
                      </p>
                      <p className="text-xl font-bold">Sob consulta</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Disponibilidade e variacoes no atendimento.
                </p>

              </div>

            </div>
          </div>

        </div>
      </div>
    </Page>
  );
}
