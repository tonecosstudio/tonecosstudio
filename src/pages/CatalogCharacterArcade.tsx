import { useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Package, Shapes } from "lucide-react";
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

type CharacterPageModelKind = "direct" | "wrapped" | "composite";

function normalizeCharacterPageText(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getCharacterPageModelKind(
  rawCharacterName: string | null | undefined,
  characterName: string,
): CharacterPageModelKind {
  const raw = String(rawCharacterName || "").trim();
  const normalizedRaw = normalizeCharacterPageText(raw);
  const normalizedCharacter = normalizeCharacterPageText(characterName);

  if (!normalizedRaw || normalizedRaw === normalizedCharacter) return "direct";
  if (
    /^busto\b/i.test(raw) ||
    /^painel\b/i.test(raw)
  ) {
    return "wrapped";
  }
  if (
    /^conjunto\b/i.test(raw) ||
    /\bvs\b/i.test(raw) ||
    /,/.test(raw) ||
    /\se\s/i.test(normalizedRaw)
  ) {
    return "composite";
  }
  return "direct";
}

function getCharacterPageContextBadge(
  rawCharacterName: string | null | undefined,
): string | null {
  const raw = String(rawCharacterName || "").trim();
  if (!raw) return null;
  if (/^busto\b/i.test(raw)) return "Busto";
  if (/^painel\b/i.test(raw)) return "Painel";
  if (/^conjunto\b/i.test(raw)) return "Conjunto";
  if (/\bvs\b/i.test(raw)) return "Confronto";
  if (/,/.test(raw) || /\se\s/i.test(normalizeCharacterPageText(raw))) {
    return "Participacao";
  }
  return null;
}

export default function CatalogCharacterArcade() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const legacyCharacterName = searchParams.get("character")?.trim() ?? "";
  const legacySourceTitle = searchParams.get("source")?.trim() ?? "";
  const sortMode = searchParams.get("sort") === "az" ? "az" : "recent";
  const activeTag = searchParams.get("tag")?.trim() ?? "";

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
    const nextSearch = new URLSearchParams(searchParams);
    nextSearch.delete("character");
    nextSearch.delete("source");
    navigate(
      {
        pathname: PUBLIC_ROUTES.catalogCharacter.replace(
          ":slug",
          encodeURIComponent(contextQuery.data.slug),
        ),
        search: nextSearch.toString() ? `?${nextSearch.toString()}` : "",
      },
      { replace: true },
    );
  }, [contextQuery.data, legacyCharacterName, navigate, searchParams, slug]);

  const modelsQuery = useQuery({
    queryKey: ["catalog-character-models", { characterName, sourceTitle }],
    queryFn: () => listCatalogCharacterModels({ characterName, sourceTitle }),
    enabled: Boolean(characterName),
  });
  const rows = modelsQuery.data ?? [];
  const availableTags = useMemo(() => {
    const tagSource = rows.flatMap((row) => getCatalogPublicTags(row, 6));
    return Array.from(new Set(tagSource)).slice(0, 8);
  }, [rows]);

  useEffect(() => {
    if (!activeTag) return;
    if (availableTags.includes(activeTag)) return;
    const nextSearch = new URLSearchParams(searchParams);
    nextSearch.delete("tag");
    setSearchParams(nextSearch, { replace: true });
  }, [activeTag, availableTags, searchParams, setSearchParams]);

  const filteredRows = useMemo(() => {
    const next = activeTag
      ? rows.filter((row) => getCatalogPublicTags(row, 8).includes(activeTag))
      : [...rows];
    if (sortMode === "az") {
      next.sort((left, right) =>
        (left.variant_name || left.name || left.character_name || "").localeCompare(
          right.variant_name || right.name || right.character_name || "",
          "pt-BR",
        ),
      );
      return next;
    }
    return next;
  }, [activeTag, rows, sortMode]);
  const groupedDisplayRows = useMemo(() => {
    const primary: typeof filteredRows = [];
    const related: typeof filteredRows = [];

    for (const row of filteredRows) {
      const kind = getCharacterPageModelKind(row.character_name, characterName);
      if (kind === "composite") related.push(row);
      else primary.push(row);
    }

    return {
      primary,
      related,
      primaryCount: primary.length,
      relatedCount: related.length,
    };
  }, [characterName, filteredRows]);
  const likesQuery = useLikedModelIdsQuery(user?.id);
  const likedIds = likesQuery.data ?? new Set<string>();

  const coverImageUrl = rows[0]?.thumbnailUrl ?? rows[0]?.imageUrl ?? null;
  const sourceName = sourceTitle || getCatalogSourceName(rows[0] ?? null);
  const topTags = useMemo(() => {
    const tagSource = rows.flatMap((row) => getCatalogPublicTags(row, 4));
    return Array.from(new Set(tagSource)).slice(0, 6);
  }, [rows]);

  const updateFilterParams = (next: {
    sort?: "recent" | "az";
    tag?: string;
  }) => {
    const nextSearch = new URLSearchParams(searchParams);
    const nextSort = next.sort ?? sortMode;
    const nextTag = next.tag ?? activeTag;

    if (nextSort === "recent") nextSearch.delete("sort");
    else nextSearch.set("sort", nextSort);

    if (!nextTag) nextSearch.delete("tag");
    else nextSearch.set("tag", nextTag);

    setSearchParams(nextSearch, { replace: true });
  };

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

      <section className="mx-auto max-w-7xl px-4 pb-12 md:px-6">
        <ArcadeCard hover={false} className="mb-6 overflow-hidden">
          <div className="grid gap-0 md:grid-cols-[140px_minmax(0,1fr)]">
            <div className="aspect-[4/5] bg-[hsl(0,0%,8%)] md:aspect-auto">
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

            <div className="flex flex-col justify-center gap-4 p-4 md:p-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
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
                      Tags principais
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {topTags.slice(0, 5).map((tag) => (
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
            </div>
          </div>
        </ArcadeCard>

        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <ArcadeSectionTitle>Modelos</ArcadeSectionTitle>
            <div className="flex items-center gap-2 self-start">
              <button
                type="button"
                onClick={() => updateFilterParams({ sort: "recent" })}
                className={`border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] transition-colors ${
                  sortMode === "recent"
                    ? "border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent)/0.12)] text-[hsl(var(--gold-accent))]"
                    : "border-[hsl(0,0%,15%)] text-[hsl(0,0%,52%)] hover:border-[hsl(var(--gold-accent)/0.35)]"
                }`}
              >
                Recentes
              </button>
              <button
                type="button"
                onClick={() => updateFilterParams({ sort: "az" })}
                className={`border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] transition-colors ${
                  sortMode === "az"
                    ? "border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent)/0.12)] text-[hsl(var(--gold-accent))]"
                    : "border-[hsl(0,0%,15%)] text-[hsl(0,0%,52%)] hover:border-[hsl(var(--gold-accent)/0.35)]"
                }`}
              >
                A-Z
              </button>
            </div>
          </div>
          {(groupedDisplayRows.primaryCount > 0 || groupedDisplayRows.relatedCount > 0) && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,6%)] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[hsl(0,0%,60%)]">
                {groupedDisplayRows.primaryCount} diretos
              </span>
              {groupedDisplayRows.relatedCount > 0 && (
                <span className="inline-flex items-center border border-[hsl(var(--gold-accent)/0.22)] bg-[hsl(var(--gold-accent)/0.08)] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[hsl(var(--gold-accent))]">
                  {groupedDisplayRows.relatedCount} participacoes
                </span>
              )}
            </div>
          )}
          {availableTags.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => updateFilterParams({ tag: "" })}
                className={`border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] transition-colors ${
                  !activeTag
                    ? "border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent)/0.12)] text-[hsl(var(--gold-accent))]"
                    : "border-[hsl(0,0%,15%)] text-[hsl(0,0%,52%)] hover:border-[hsl(var(--gold-accent)/0.35)]"
                }`}
              >
                Todos
              </button>
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => updateFilterParams({ tag })}
                  className={`border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] transition-colors ${
                    activeTag === tag
                      ? "border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent)/0.12)] text-[hsl(var(--gold-accent))]"
                      : "border-[hsl(0,0%,15%)] text-[hsl(0,0%,52%)] hover:border-[hsl(var(--gold-accent)/0.35)]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
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
          ) : filteredRows.length === 0 ? (
            <ArcadeCard hover={false} className="p-8 text-center">
              <Shapes className="mx-auto mb-4 h-12 w-12 text-[hsl(0,0%,22%)]" />
              <h2
                className="text-2xl font-black uppercase tracking-[0.08em]"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                Nenhum modelo nessa tag
              </h2>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(0,0%,45%)]">
                Ajuste o filtro para ver outras variacoes deste personagem.
              </p>
            </ArcadeCard>
          ) : (
            <div className="space-y-8">
              {groupedDisplayRows.primaryCount > 0 && (
                <div>
                  {groupedDisplayRows.relatedCount > 0 && (
                    <div className="mb-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(0,0%,45%)]">
                        Modelos do personagem
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                    {groupedDisplayRows.primary.map((model) => {
                      const isLiked = Boolean(user?.id) && likedIds.has(model.id);
                      return (
                        <UniverseModelCard
                          key={model.id}
                          model={model}
                          isLiked={isLiked}
                          onToggleLike={() => handleToggleLike(model.id, isLiked)}
                          onTagClick={(tag) => updateFilterParams({ tag })}
                          contextBadge={getCharacterPageContextBadge(model.character_name)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {groupedDisplayRows.relatedCount > 0 && (
                <div>
                  <div className="mb-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--gold-accent)/0.82)]">
                      Participacoes, conjuntos e confrontos
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                    {groupedDisplayRows.related.map((model) => {
                      const isLiked = Boolean(user?.id) && likedIds.has(model.id);
                      return (
                        <UniverseModelCard
                          key={model.id}
                          model={model}
                          isLiked={isLiked}
                          onToggleLike={() => handleToggleLike(model.id, isLiked)}
                          onTagClick={(tag) => updateFilterParams({ tag })}
                          contextBadge={getCharacterPageContextBadge(model.character_name)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </Page>
  );
}
