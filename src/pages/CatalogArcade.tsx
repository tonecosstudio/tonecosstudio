import { useEffect, useMemo } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  Crosshair,
  Folder,
  FolderOpen,
  Package,
  Sparkles,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeCard,
  ArcadeHero,
  ArcadeSectionTitle,
} from "@/components/arcade/ArcadeLayout";
import { FloatingParticles } from "@/components/arcade/ArcadeEffects";
import {
  PUBLIC_ROUTES,
  catalogModelDetailsPath,
  catalogUniverseCharacterPath,
  catalogUniverseFranchisePath,
  catalogUniverseThemePath,
} from "@/config/routes";
import {
  listCatalogCharacterModels,
  listCatalogUniverseIndex,
  type CatalogUniverseFranchiseRow,
  type CatalogUniverseThemeRow,
} from "@/services/catalog/catalog-models-service";
import type { CatalogCharacterRow, CatalogModelRow } from "@/types/catalog";
import { getCatalogCharacterName, getCatalogVersionName } from "@/lib/catalog-utils";

function UniverseMiniFolderCard({
  title,
  subtitle,
  countLabel,
  imageUrl,
  to,
  tone = "root",
}: {
  title: string;
  subtitle: string;
  countLabel: string;
  imageUrl: string | null;
  to: string;
  tone?: "root" | "branch";
}) {
  return (
    <ArcadeCard>
      <Link to={to} className="group flex h-full flex-col">
        <div className="relative aspect-square overflow-hidden bg-[hsl(0,0%,8%)]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover opacity-75 transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Crosshair className="h-8 w-8 text-[hsl(0,0%,18%)]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0,0%,5%)] via-[hsl(0,0%,5%)]/20 to-transparent" />
          <div className="absolute left-2 top-2 border border-[hsl(var(--gold-accent)/0.28)] bg-[hsl(0,0%,5%)]/92 px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.16em] text-[hsl(var(--gold-accent))]">
            {tone === "root" ? "Raiz" : "Subpasta"}
          </div>
          <div className="absolute right-2 top-2 text-[hsl(var(--gold-accent))]">
            {tone === "root" ? (
              <Folder className="h-4 w-4" />
            ) : (
              <FolderOpen className="h-4 w-4" />
            )}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-2.5">
          <div className="line-clamp-2 text-sm font-black uppercase tracking-[0.05em] text-[hsl(0,0%,97%)] group-hover:text-[hsl(var(--gold-accent))]">
            {title}
          </div>
          <div className="line-clamp-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[hsl(0,0%,48%)]">
            {subtitle}
          </div>
          <div className="mt-auto inline-flex w-fit items-center gap-1.5 border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,6%)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[hsl(0,0%,70%)]">
            <Package className="h-3 w-3" />
            {countLabel}
          </div>
        </div>
      </Link>
    </ArcadeCard>
  );
}

function UniverseMiniCharacterCard({
  row,
  to,
}: {
  row: CatalogCharacterRow;
  to: string;
}) {
  const imageUrl = row.thumbnailUrl ?? row.imageUrl;

  return (
    <ArcadeCard>
      <Link to={to} className="group flex h-full flex-col">
        <div className="relative aspect-[3/4] overflow-hidden bg-[hsl(0,0%,8%)]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={row.character_name}
              className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Crosshair className="h-8 w-8 text-[hsl(0,0%,18%)]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0,0%,5%)] via-transparent to-transparent" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-2.5">
          <div className="line-clamp-2 text-sm font-black uppercase tracking-[0.05em] text-[hsl(0,0%,97%)] group-hover:text-[hsl(var(--gold-accent))]">
            {row.character_name}
          </div>
          {row.source_title && (
            <div className="line-clamp-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[hsl(0,0%,48%)]">
              {row.source_title}
            </div>
          )}
          <div className="mt-auto inline-flex w-fit items-center gap-1.5 border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,6%)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[hsl(0,0%,70%)]">
            <Sparkles className="h-3 w-3" />
            {row.model_count} {row.model_count === 1 ? "modelo" : "modelos"}
          </div>
        </div>
      </Link>
    </ArcadeCard>
  );
}

function UniverseMiniModelCard({ model }: { model: CatalogModelRow }) {
  const imageUrl = model.thumbnailUrl ?? model.imageUrl;
  const characterName = getCatalogCharacterName(model);
  const versionName = getCatalogVersionName(model);
  const title = versionName || characterName;
  const detailsPath = catalogModelDetailsPath(
    model.id,
    [model.character_name || model.name, model.variant_name]
      .filter(Boolean)
      .join(" "),
  );

  return (
    <ArcadeCard>
      <Link to={detailsPath} className="group flex h-full flex-col">
        <div className="relative aspect-[3/4] overflow-hidden bg-[hsl(0,0%,8%)]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Crosshair className="h-8 w-8 text-[hsl(0,0%,18%)]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0,0%,5%)] via-transparent to-transparent" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-2.5">
          <div className="line-clamp-2 text-sm font-black uppercase tracking-[0.05em] text-[hsl(0,0%,97%)] group-hover:text-[hsl(var(--gold-accent))]">
            {title}
          </div>
          {title !== characterName && (
            <div className="line-clamp-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[hsl(0,0%,48%)]">
              {characterName}
            </div>
          )}
          <div className="mt-auto inline-flex w-fit items-center gap-1.5 border border-[hsl(var(--gold-accent)/0.28)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[hsl(var(--gold-accent))]">
            Abrir detalhe
            <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </Link>
    </ArcadeCard>
  );
}

function buildUniversePath(params: {
  themeKey?: string | null;
  franchiseKey?: string | null;
  characterSlug?: string | null;
}) {
  if (params.themeKey && params.franchiseKey && params.characterSlug) {
    return catalogUniverseCharacterPath(
      params.themeKey,
      params.franchiseKey,
      params.characterSlug,
    );
  }

  if (params.themeKey && params.franchiseKey) {
    return catalogUniverseFranchisePath(params.themeKey, params.franchiseKey);
  }

  if (params.themeKey) {
    return catalogUniverseThemePath(params.themeKey);
  }

  return PUBLIC_ROUTES.catalog;
}

function isUuidLikePathParam(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeUniverseKey(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function slugifyUniverseSegment(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getUniverseThemeKeyForCharacter(row: CatalogCharacterRow) {
  const combined = [row.source_title, row.category, ...(row.tags ?? [])]
    .map(normalizeUniverseKey)
    .join(" ");

  if (/\bmarvel\b/.test(combined)) return "marvel";
  if (/\bdc\b/.test(combined) || /\bdc-comics\b/.test(combined)) return "dc";

  const sourceType = normalizeUniverseKey(row.source_type);
  if (sourceType === "anime") return "anime";
  if (sourceType === "manga") return "manga";
  if (sourceType === "movie") return "filmes";
  if (sourceType === "series") return "series";
  if (sourceType === "game") return "games";
  if (sourceType === "comic") return "quadrinhos";
  if (sourceType === "tokusatsu") return "tokusatsu";
  if (sourceType === "original") return "originais";

  const category = normalizeUniverseKey(row.category);
  if (category === "quadrinhos") return "quadrinhos";
  if (category === "filmes") return "filmes";
  if (category === "series") return "series";
  if (category === "jogos") return "games";
  if (
    category === "desenhos" ||
    category === "desenho" ||
    category === "animacao" ||
    category === "desenho animacao" ||
    category === "desenhos animacao"
  ) {
    return "desenho-animacao";
  }

  return "outros";
}

function getUniverseFranchiseKeyForCharacter(
  row: CatalogCharacterRow,
  fallbackThemeKey: string,
) {
  return slugifyUniverseSegment(row.source_title || "") || fallbackThemeKey;
}

export default function CatalogArcade() {
  const navigate = useNavigate();
  const { themeKey = "", franchiseKey = "", characterSlug = "" } = useParams<{
    themeKey?: string;
    franchiseKey?: string;
    characterSlug?: string;
  }>();
  const [searchParams] = useSearchParams();
  const legacyTheme = searchParams.get("tema")?.trim().toLowerCase() ?? "";
  const legacyFranchise = searchParams.get("obra")?.trim().toLowerCase() ?? "";
  const legacyCharacter = searchParams.get("personagem")?.trim().toLowerCase() ?? "";

  const activeTheme = (themeKey || legacyTheme).trim().toLowerCase();
  const activeFranchise = (franchiseKey || legacyFranchise).trim().toLowerCase();
  const activeCharacter = (characterSlug || legacyCharacter).trim().toLowerCase();
  const hasLegacyQuery = Boolean(legacyTheme || legacyFranchise || legacyCharacter);
  const shouldRedirectLegacyModel =
    activeTheme && isUuidLikePathParam(activeTheme) && !activeFranchise && !activeCharacter;

  useEffect(() => {
    if (!hasLegacyQuery) return;
    navigate(
      buildUniversePath({
        themeKey: legacyTheme || activeTheme || null,
        franchiseKey: legacyFranchise || activeFranchise || null,
        characterSlug: legacyCharacter || activeCharacter || null,
      }),
      { replace: true },
    );
  }, [
    activeCharacter,
    activeFranchise,
    activeTheme,
    hasLegacyQuery,
    legacyCharacter,
    legacyFranchise,
    legacyTheme,
    navigate,
  ]);

  const universeQuery = useQuery({
    queryKey: ["catalog-universe-index"],
    queryFn: listCatalogUniverseIndex,
  });

  const themes = useMemo(() => universeQuery.data?.themes ?? [], [universeQuery.data?.themes]);
  const franchises = useMemo(
    () => universeQuery.data?.franchises ?? [],
    [universeQuery.data?.franchises],
  );
  const characters = useMemo(
    () => universeQuery.data?.characters ?? [],
    [universeQuery.data?.characters],
  );

  const currentTheme = useMemo(
    () => themes.find((theme) => theme.key === activeTheme) ?? null,
    [activeTheme, themes],
  );
  const currentFranchise = useMemo(
    () =>
      franchises.find(
        (franchise) =>
          franchise.themeKey === activeTheme && franchise.key === activeFranchise,
      ) ?? null,
    [activeFranchise, activeTheme, franchises],
  );

  const visibleFranchises = useMemo(
    () =>
      activeTheme
        ? franchises.filter((franchise) => franchise.themeKey === activeTheme)
        : [],
    [activeTheme, franchises],
  );

  const visibleCharacters = useMemo(() => {
    if (!activeTheme || !activeFranchise || !currentFranchise) return [];
    return characters.filter((row) => {
      const rowThemeKey = getUniverseThemeKeyForCharacter(row);
      if (rowThemeKey !== activeTheme) return false;

      const rowFranchiseKey = getUniverseFranchiseKeyForCharacter(row, rowThemeKey);
      return rowFranchiseKey === currentFranchise.key;
    });
  }, [activeFranchise, activeTheme, characters, currentFranchise]);

  const currentCharacter = useMemo(
    () => visibleCharacters.find((row) => row.slug === activeCharacter) ?? null,
    [activeCharacter, visibleCharacters],
  );

  const characterModelsQuery = useQuery({
    queryKey: [
      "catalog-universe-character-models",
      currentCharacter?.character_name ?? "",
      currentCharacter?.source_title ?? "",
    ],
    queryFn: () =>
      listCatalogCharacterModels({
        characterName: currentCharacter?.character_name ?? "",
        sourceTitle: currentCharacter?.source_title ?? "",
      }),
    enabled: Boolean(currentCharacter),
  });

  const visibleModels = useMemo(
    () => characterModelsQuery.data ?? [],
    [characterModelsQuery.data],
  );

  const stats = useMemo(() => {
    if (currentCharacter) {
      return {
        primary: visibleModels.length,
        primaryLabel: visibleModels.length === 1 ? "Modelo" : "Modelos",
        secondary: 1,
        secondaryLabel: "Personagem",
      };
    }

    if (activeTheme && activeFranchise) {
      return {
        primary: visibleCharacters.length,
        primaryLabel: visibleCharacters.length === 1 ? "Personagem" : "Personagens",
        secondary: visibleCharacters.reduce((total, row) => total + row.model_count, 0),
        secondaryLabel: "Modelos",
      };
    }

    if (activeTheme) {
      return {
        primary: visibleFranchises.length,
        primaryLabel: visibleFranchises.length === 1 ? "Subpasta" : "Subpastas",
        secondary: visibleFranchises.reduce((total, row) => total + row.modelCount, 0),
        secondaryLabel: "Modelos",
      };
    }

    return {
      primary: themes.length,
      primaryLabel: themes.length === 1 ? "Pasta raiz" : "Pastas raiz",
      secondary: themes.reduce((total, row) => total + row.modelCount, 0),
      secondaryLabel: "Modelos",
    };
  }, [
    activeFranchise,
    activeTheme,
    currentCharacter,
    themes,
    visibleCharacters,
    visibleFranchises,
    visibleModels.length,
  ]);

  const breadcrumb = [
    { label: "Universo", href: PUBLIC_ROUTES.catalog },
    ...(currentTheme
      ? [{ label: currentTheme.label, href: buildUniversePath({ themeKey: currentTheme.key }) }]
      : []),
    ...(currentFranchise
      ? [
          {
            label: currentFranchise.label,
            href: buildUniversePath({
              themeKey: currentTheme?.key,
              franchiseKey: currentFranchise.key,
            }),
          },
        ]
      : []),
    ...(currentCharacter
      ? [
          {
            label: currentCharacter.character_name,
            href: buildUniversePath({
              themeKey: currentTheme?.key,
              franchiseKey: currentFranchise?.key,
              characterSlug: currentCharacter.slug,
            }),
          },
        ]
      : []),
  ];

  const currentLevelTitle = currentCharacter
    ? currentCharacter.character_name
    : currentFranchise
      ? currentFranchise.label
      : currentTheme
        ? currentTheme.label
        : "Pastas raiz";

  const currentLevelSubtitle = currentCharacter
    ? ">> MINIATURAS DE MODELOS"
    : currentFranchise
      ? ">> PERSONAGENS"
      : currentTheme
        ? ">> SUBPASTAS"
        : ">> TEMAS PRINCIPAIS";

  if (shouldRedirectLegacyModel) {
    return <Navigate to={catalogModelDetailsPath(activeTheme)} replace />;
  }

  return (
    <Page
      title="Universo | ORDAX"
      description="Navegue pelo acervo em estrutura tematica, com pastas, subpastas, personagens e miniaturas de modelos."
      keywords={["universo", "pastas", "subpastas", "personagens", "modelos", "ordax"]}
    >
      <section className="relative overflow-hidden">
        <FloatingParticles />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--gold-accent)/0.08),transparent_45%)]" />

        <div className="relative mx-auto max-w-7xl px-4 md:px-6">
          <ArcadeHero
            badge="Arquivo Tematico"
            title={currentCharacter ? currentCharacter.character_name.toUpperCase() : "UNIVERSO"}
            subtitle={currentLevelSubtitle}
            stats={[
              { value: stats.primary, label: stats.primaryLabel },
              { value: stats.secondary, label: stats.secondaryLabel },
            ]}
          />
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-6 max-w-7xl px-4 pb-12 md:px-6">
        <div className="mb-5 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(0,0%,48%)]">
          {breadcrumb.map((item, index) => (
            <div key={item.href} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="h-3 w-3 text-[hsl(0,0%,30%)]" />}
              <Link
                to={item.href}
                className="transition-colors hover:text-[hsl(var(--gold-accent))]"
              >
                {item.label}
              </Link>
            </div>
          ))}
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <ArcadeSectionTitle>{currentLevelTitle}</ArcadeSectionTitle>
          <div className="flex flex-wrap gap-2">
            <Link
              to={PUBLIC_ROUTES.characterSelect}
              className="inline-flex items-center gap-2 border border-[hsl(0,0%,15%)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(0,0%,70%)] transition-colors hover:border-[hsl(var(--gold-accent)/0.4)] hover:text-[hsl(var(--gold-accent))]"
            >
              <Users className="h-3.5 w-3.5" />
              Personagens
            </Link>
            <Link
              to={PUBLIC_ROUTES.catalogModels}
              className="inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.28)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(var(--gold-accent)/0.08)]"
            >
              <Package className="h-3.5 w-3.5" />
              Modelos
            </Link>
          </div>
        </div>

        {universeQuery.isLoading ? (
          <ArcadeCard hover={false} className="p-8 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 animate-pulse text-[hsl(0,0%,22%)]" />
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(0,0%,45%)]">
              Carregando universo...
            </p>
          </ArcadeCard>
        ) : currentCharacter ? (
          visibleModels.length === 0 && !characterModelsQuery.isLoading ? (
            <ArcadeCard hover={false} className="p-8 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-[hsl(0,0%,22%)]" />
              <h2 className="text-3xl font-black uppercase tracking-[0.08em]">
                Nenhum modelo encontrado
              </h2>
            </ArcadeCard>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {visibleModels.map((model) => (
                <UniverseMiniModelCard key={model.id} model={model} />
              ))}
            </div>
          )
        ) : activeTheme && activeFranchise ? (
          visibleCharacters.length === 0 ? (
            <ArcadeCard hover={false} className="p-8 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-[hsl(0,0%,22%)]" />
              <h2 className="text-3xl font-black uppercase tracking-[0.08em]">
                Nenhum personagem encontrado
              </h2>
            </ArcadeCard>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {visibleCharacters.map((row) => (
                <UniverseMiniCharacterCard
                  key={row.id}
                  row={row}
                  to={buildUniversePath({
                    themeKey: currentTheme?.key,
                    franchiseKey: currentFranchise?.key,
                    characterSlug: row.slug,
                  })}
                />
              ))}
            </div>
          )
        ) : activeTheme ? (
          visibleFranchises.length === 0 ? (
            <ArcadeCard hover={false} className="p-8 text-center">
              <FolderOpen className="mx-auto mb-4 h-12 w-12 text-[hsl(0,0%,22%)]" />
              <h2 className="text-3xl font-black uppercase tracking-[0.08em]">
                Nenhuma subpasta encontrada
              </h2>
            </ArcadeCard>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {visibleFranchises.map((row: CatalogUniverseFranchiseRow) => (
                <UniverseMiniFolderCard
                  key={`${row.themeKey}::${row.key}`}
                  title={row.label}
                  subtitle={row.themeLabel}
                  countLabel={`${row.characterCount} ${row.characterCount === 1 ? "personagem" : "personagens"}`}
                  imageUrl={row.thumbnailUrl ?? row.imageUrl}
                  to={buildUniversePath({ themeKey: row.themeKey, franchiseKey: row.key })}
                  tone="branch"
                />
              ))}
            </div>
          )
        ) : themes.length === 0 ? (
          <ArcadeCard hover={false} className="p-8 text-center">
            <Folder className="mx-auto mb-4 h-12 w-12 text-[hsl(0,0%,22%)]" />
            <h2 className="text-3xl font-black uppercase tracking-[0.08em]">
              Universo vazio
            </h2>
          </ArcadeCard>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {themes.map((row: CatalogUniverseThemeRow) => (
              <UniverseMiniFolderCard
                key={row.key}
                title={row.label}
                subtitle={`${row.franchiseCount} ${row.franchiseCount === 1 ? "subpasta" : "subpastas"}`}
                countLabel={`${row.characterCount} ${row.characterCount === 1 ? "personagem" : "personagens"}`}
                imageUrl={row.thumbnailUrl ?? row.imageUrl}
                to={buildUniversePath({ themeKey: row.key })}
                tone="root"
              />
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}
