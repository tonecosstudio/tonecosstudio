/**
 * Model Details Page - Metal Slug Style
 *
 * Página interna do modelo com estética arcade
 */

import { useParams, useNavigate, Link } from "react-router-dom";
import { Page } from "@/components/layouts/Page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Heart,
  Package,
  Crown,
  Tag,
  Layers,
  Coins,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { likeModel, unlikeModel } from "@/lib/model-likes";
import { useLikedModelIdsQuery } from "@/pages/catalog/hooks/useLikedModelIdsQuery";
import { buildModelTitle } from "@/pages/catalog/catalogUtils";
import { useModelDetails } from "@/hooks/catalog/useModelDetails";
import { PUBLIC_ROUTES } from "@/config/routes";
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
export default function ModelDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // ─── Fetch model ────────────────────────────────────────────
  const { data: model, isLoading } = useModelDetails(id);

  // ─── Likes ──────────────────────────────────────────────────
  const likesQuery = useLikedModelIdsQuery(user?.id);
  const likedIds = likesQuery.data ?? new Set<string>();
  const isLiked = Boolean(user?.id) && Boolean(model?.id) && likedIds.has(model?.id ?? "");

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
  const mediaLabel = model?.source_type ? SOURCE_TYPE_LABELS[model.source_type] || model.source_type : null;
  const variantLabel = model?.variant_type ? VARIANT_TYPE_LABELS[model.variant_type] || model.variant_type : null;
  const title = model
    ? variantName
      ? `${displayName} - ${variantName}`
      : buildModelTitle(model.name, sourceTitle)
    : "Modelo";
  const seoDescription = model
    ? `Veja detalhes do modelo ${title}. Estatueta artesanal da Tonecos Studios.`
    : "Veja detalhes do modelo. Estatueta artesanal da Tonecos Studios.";

  const imageUrl = model?.imageUrl ?? null;

  const infoLine = model
    ? [sourceTitle, mediaLabel, model.category, model.subcategory].filter(Boolean).join(" • ")
    : "";

  const tags = (model?.tags ?? []).map((t) => String(t).trim()).filter(Boolean);
  const taxonomyRows = [
    { label: "Personagem", value: model?.character_name },
    { label: "Versao", value: variantName },
    { label: "Tipo", value: variantLabel && variantLabel !== "Padrao" ? variantLabel : null },
    { label: "Origem", value: sourceTitle },
    { label: "Midia", value: mediaLabel },
  ].filter((row) => row.value);
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

  // ─── Loading ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Page title="Carregando..." description="Carregando informações do modelo">
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
      <Page title="Modelo não encontrado" description="O modelo solicitado não foi encontrado">
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
              Voltar ao Catálogo
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  // ─── Render ─────────────────────────────────────────────────
  return (
    <Page title={title} description={seoDescription} keywords={["modelo", "catálogo", model.name]}>
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

      <div className="min-h-screen bg-[hsl(var(--background))] py-8 md:py-12">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(PUBLIC_ROUTES.catalog)}
            className="mb-6 font-mono uppercase tracking-wider text-xs hover:text-[hsl(var(--gold-accent))]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Catálogo
          </Button>

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
                <div className="relative aspect-[3/4] w-full bg-[hsl(var(--muted))] overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={model.name}
                      className="h-full w-full object-contain p-4"
                      loading="eager"
                      fetchPriority="high"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[hsl(var(--gold-accent)/0.2)] to-[hsl(var(--background))]">
                      <Package className="w-32 h-32 text-[hsl(var(--gold-accent))]" />
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

              {/* Like Button */}
              <button
                type="button"
                className="absolute right-4 top-4 z-20 inline-flex h-12 w-12 items-center justify-center rounded-sm border-2 border-[hsl(var(--gold-accent))] bg-[hsl(var(--background)/0.9)] text-[hsl(var(--foreground))] shadow-[0_0_15px_hsl(var(--gold-accent)/0.3)] backdrop-blur-sm transition-all duration-300 hover:bg-[hsl(var(--gold-accent)/0.2)] hover:shadow-[0_0_25px_hsl(var(--gold-accent)/0.5)]"
                onClick={onToggleLike}
                aria-pressed={isLiked}
                aria-label={isLiked ? "Remover dos favoritos" : "Adicionar aos favoritos"}
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
                    Catálogo
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

                <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-[hsl(var(--gold-accent))] mb-2 font-mono drop-shadow-[0_0_10px_hsl(var(--gold-accent))]">
                  {title}
                </h1>

                {infoLine && (
                  <p className="text-[hsl(var(--muted-foreground))] text-sm md:text-base font-mono uppercase tracking-wider">
                    {infoLine}
                  </p>
                )}
              </div>

              {/* Description */}
              {model.description && (
                <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-sm p-4">
                  <p className="text-[hsl(var(--muted-foreground))] text-sm leading-relaxed">
                    {model.description}
                  </p>
                </div>
              )}

              {taxonomyRows.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {taxonomyRows.map((row) => (
                    <div key={row.label} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        {row.label}
                      </p>
                      <p className="truncate text-sm font-semibold" title={String(row.value)}>
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-3 flex items-center gap-2">
                    <Layers className="w-3 h-3" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.slice(0, 14).map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="font-mono text-xs uppercase tracking-wider border-[hsl(var(--border))] hover:border-[hsl(var(--gold-accent))] transition-colors duration-300"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Card */}
              <div className="bg-[hsl(var(--card))] border-2 border-[hsl(var(--gold-accent)/0.3)] rounded-sm p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[hsl(var(--gold-accent))] mb-3">
                  Produção Artesanal
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
                    <div className="border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.6)] p-3">
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Avulso
                      </p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(fixedCashPrice / 100)}
                      </p>
                    </div>
                  ) : (
                    <div className="border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.6)] p-3 sm:col-span-2">
                      <p className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        <MessageCircle className="h-3 w-3" />
                        Preco
                      </p>
                      <p className="text-xl font-bold">Sob consulta</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4 leading-relaxed">
                  Peça feita sob encomenda, com pintura artística à mão. Disponível para compra
                  avulsa ou através das coleções com assinatura.
                </p>

                <div className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    className="w-full bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--gold-accent)/0.9)] font-mono uppercase tracking-wider text-sm"
                    asChild
                  >
                    <Link to={PUBLIC_ROUTES.collectionsArcade}>
                      <Crown className="w-5 h-5 mr-2" />
                      Ver Coleções
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-[hsl(var(--gold-accent)/0.5)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)] font-mono uppercase tracking-wider text-sm"
                    asChild
                  >
                    <Link to={PUBLIC_ROUTES.plans}>Ver Planos de Assinatura</Link>
                  </Button>
                </div>
              </div>

              {/* Date Info */}
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                <span>Adicionado em</span>
                <span className="text-[hsl(var(--gold-accent))]">
                  {new Date(model.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 bg-gradient-to-r from-[hsl(var(--gold-accent)/0.1)] to-transparent border-l-4 border-[hsl(var(--gold-accent))] rounded-sm p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold uppercase tracking-wider font-mono text-[hsl(var(--gold-accent))] mb-2">
                  Quer essa peça?
                </h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Explore nossas coleções e planos de assinatura para adquirir este e outros modelos
                  exclusivos
                </p>
              </div>
              <Button
                size="lg"
                className="bg-[hsl(var(--gold-accent))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--gold-accent)/0.9)] font-mono uppercase tracking-wider text-sm whitespace-nowrap"
                asChild
              >
                <Link to={PUBLIC_ROUTES.plans}>Ver Planos</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
