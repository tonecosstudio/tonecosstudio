import { useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Package, Shapes, Sparkles } from "lucide-react";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeCard,
  ArcadeHero,
  ArcadeSectionTitle,
} from "@/components/arcade/ArcadeLayout";
import { FloatingParticles } from "@/components/arcade/ArcadeEffects";
import { PUBLIC_ROUTES } from "@/config/routes";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { likeModel, unlikeModel } from "@/lib/model-likes";
import { useLikedModelIdsQuery } from "@/pages/catalog/hooks/useLikedModelIdsQuery";
import { UniverseModelCard } from "@/components/catalog/UniverseModelCard";
import {
  getCatalogCharacterContextBySlug,
  listCatalogCharacterModels,
} from "@/services/catalog/catalog-models-service";
import { getCatalogPublicTags, getCatalogSourceName } from "@/lib/catalog-utils";

export default function CatalogCharacterArcade() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const legacyCharacterName = searchParams.get("character")?.trim() ?? "";
  const legacySourceTitle = searchParams.get("source")?.trim() ?? "";

  const contextQuery = useQuery({
    queryKey: [
      "catalog-character-context",
      slug ?? "",
      legacyCharacterName,
      legacySourceTitle,
    ],
    queryFn: async () => {
      if (legacyCharacterName) {
        return {
          slug: slug ?? "",
          characterName: legacyCharacterName,
          sourceTitle: legacySourceTitle || null,
        };
      }
      if (!slug) return null;
      return getCatalogCharacterContextBySlug(slug);
    },
    enabled: Boolean(slug || legacyCharacterName),
  });

  const characterName = contextQuery.data?.characterName ?? "";
  const sourceTitle = contextQuery.data?.sourceTitle ?? "";

  useEffect(() => {
    if (!legacyCharacterName || !slug || !contextQuery.data?.slug) return;
    navigate(
      PUBLIC_ROUTES.catalogCharacter.replace(
        ":slug",
        encodeURIComponent(contextQuery.data.slug),
      ),
      { replace: true },
    );
  }, [contextQuery.data, legacyCharacterName, navigate, slug]);

  const modelsQuery = useQuery({
    queryKey: ["catalog-character-models", { characterName, sourceTitle }],
    queryFn: () => listCatalogCharacterModels({ characterName, sourceTitle }),
    enabled: Boolean(characterName),
  });
  const rows = modelsQuery.data ?? [];
  const likesQuery = useLikedModelIdsQuery(user?.id);
  const likedIds = likesQuery.data ?? new Set<string>();

  const coverImageUrl = rows[0]?.thumbnailUrl ?? rows[0]?.imageUrl ?? null;
  const sourceName = sourceTitle || getCatalogSourceName(rows[0] ?? null);
  const topTags = useMemo(() => {
    const tagSource = rows.flatMap((row) => getCatalogPublicTags(row, 4));
    return Array.from(new Set(tagSource)).slice(0, 6);
  }, [rows]);

  const handleToggleLike = async (modelId: string, isLiked: boolean) => {
    if (!user?.id) {
      toast({
        title: "Entre para favoritar",
        description: "Faca login para salvar seus modelos preferidos.",
      });
      return;
    }
    try {
      if (isLiked) await unlikeModel(user.id, modelId);
      else await likeModel(user.id, modelId);
      await likesQuery.refetch();
    } catch {
      toast({ title: "Erro ao favoritar", variant: "destructive" });
    }
  };

  if (contextQuery.isLoading) {
    return (
      <Page title="Carregando personagem" description="Carregando pagina de personagem.">
        <section className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4">
          <div className="text-center">
            <Package className="mx-auto mb-4 h-14 w-14 animate-pulse text-[hsl(0,0%,25%)]" />
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(0,0%,45%)]">
              Carregando personagem...
            </p>
          </div>
        </section>
      </Page>
    );
  }

  if (!characterName) {
    return (
      <Page title="Personagem nao encontrado" description="Link de personagem invalido.">
        <section className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4">
          <div className="text-center">
            <Package className="mx-auto mb-4 h-14 w-14 text-[hsl(0,0%,25%)]" />
            <h1
              className="text-3xl font-black uppercase tracking-[0.08em]"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              Personagem invalido
            </h1>
            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              O link nao trouxe contexto suficiente para abrir a pagina do personagem.
            </p>
            <button
              onClick={() => navigate(PUBLIC_ROUTES.catalog)}
              className="mt-6 inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.3)] px-5 py-2 font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Universo
            </button>
          </div>
        </section>
      </Page>
    );
  }

  return (
    <Page
      title={`${characterName} | Universo ORDAX`}
      description={`Modelos de ${characterName}${sourceName ? ` em ${sourceName}` : ""}.`}
    >
      <section className="relative overflow-hidden">
        <FloatingParticles />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--gold-accent)/0.08),transparent_45%)]" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-6">
          <div className="pt-6">
            <button
              type="button"
              onClick={() => navigate(PUBLIC_ROUTES.catalog)}
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[hsl(0,0%,62%)] transition-colors hover:text-[hsl(var(--gold-accent))]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao Universo
            </button>
          </div>
          <ArcadeHero
            badge="Indice de Personagem"
            title={characterName.toUpperCase()}
            subtitle={sourceName ? `>> ${sourceName.toUpperCase()}` : ">> MODELOS DISPONIVEIS"}
            stats={[
              { value: rows.length, label: rows.length === 1 ? "Modelo" : "Modelos" },
              { value: topTags.length, label: topTags.length === 1 ? "Tag" : "Tags" },
            ]}
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 md:px-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <ArcadeCard hover={false} className="overflow-hidden">
            <div className="aspect-[4/5] bg-[hsl(0,0%,8%)]">
              {coverImageUrl ? (
                <img
                  src={coverImageUrl}
                  alt={characterName}
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="h-16 w-16 text-[hsl(0,0%,20%)]" />
                </div>
              )}
            </div>
            <div className="space-y-4 p-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--gold-accent)/0.75)]">
                  Personagem
                </p>
                <p
                  className="mt-1 text-2xl font-black uppercase tracking-[0.06em]"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                >
                  {characterName}
                </p>
              </div>
              {sourceName && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--gold-accent)/0.75)]">
                    Obra
                  </p>
                  <p className="mt-1 text-sm uppercase tracking-[0.12em] text-[hsl(0,0%,82%)]">
                    {sourceName}
                  </p>
                </div>
              )}
              {topTags.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--gold-accent)/0.75)]">
                    Tags
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {topTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,5%)] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[hsl(0,0%,55%)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ArcadeCard>
        </aside>

        <div>
          <ArcadeSectionTitle>Modelos</ArcadeSectionTitle>
          {modelsQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-[3/4] animate-pulse border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,8%)]"
                />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <ArcadeCard hover={false} className="p-8 text-center">
              <Shapes className="mx-auto mb-4 h-12 w-12 text-[hsl(0,0%,22%)]" />
              <h2
                className="text-2xl font-black uppercase tracking-[0.08em]"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                Nenhum modelo encontrado
              </h2>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(0,0%,45%)]">
                Este personagem ainda nao tem modelos publicos disponiveis.
              </p>
            </ArcadeCard>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {rows.map((model) => {
                const isLiked = Boolean(user?.id) && likedIds.has(model.id);
                return (
                  <UniverseModelCard
                    key={model.id}
                    model={model}
                    isLiked={isLiked}
                    onToggleLike={() => handleToggleLike(model.id, isLiked)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 md:px-6">
        <ArcadeCard hover={false} className="px-5 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-[hsl(var(--gold-accent))]" />
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(0,0%,58%)]">
              O universo principal agora organiza a navegacao por personagem. Os modelos ficam aqui.
            </p>
          </div>
        </ArcadeCard>
      </section>
    </Page>
  );
}
