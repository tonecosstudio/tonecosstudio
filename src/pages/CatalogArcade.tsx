import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Crosshair,
  Folder,
  FolderOpen,
  Package,
  Sparkles,
  Trophy,
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
  catalogCharacterPath,
} from "@/config/routes";
import {
  listCatalogUniverseIndex,
  type CatalogUniverseFranchiseRow,
  type CatalogUniverseThemeRow,
} from "@/services/catalog/catalog-models-service";
import type { CatalogCharacterRow } from "@/types/catalog";

function UniverseFolderCard({
  title,
  subtitle,
  countLabel,
  imageUrl,
  to,
  accent = "theme",
}: {
  title: string;
  subtitle: string;
  countLabel: string;
  imageUrl: string | null;
  to: string;
  accent?: "theme" | "franchise";
}) {
  return (
    <ArcadeCard>
      <Link to={to} className="group flex h-full flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-[hsl(0,0%,8%)]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Crosshair className="h-10 w-10 text-[hsl(0,0%,18%)]" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0,0%,5%)] via-[hsl(0,0%,5%)]/25 to-transparent" />
          <div className="absolute left-3 top-3 border border-[hsl(var(--gold-accent)/0.28)] bg-[hsl(0,0%,5%)]/92 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.16em] text-[hsl(var(--gold-accent))]">
            {accent === "theme" ? "Pasta raiz" : "Subpasta"}
          </div>
          <div className="absolute right-3 top-3 text-[hsl(var(--gold-accent))]">
            {accent === "theme" ? (
              <Folder className="h-5 w-5" />
            ) : (
              <FolderOpen className="h-5 w-5" />
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="text-xl font-black uppercase tracking-[0.06em] text-[hsl(0,0%,97%)] group-hover:text-[hsl(var(--gold-accent))]">
            {title}
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[hsl(0,0%,48%)]">
            {subtitle}
          </p>
          <div className="mt-3 inline-flex w-fit items-center gap-2 border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,6%)] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[hsl(0,0%,70%)]">
            <Package className="h-3.5 w-3.5" />
            {countLabel}
          </div>
          <div className="mt-auto flex items-center gap-2 pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--gold-accent))]">
            Abrir pasta
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </Link>
    </ArcadeCard>
  );
}

function UniverseCharacterCard({ row }: { row: CatalogCharacterRow }) {
  const path = catalogCharacterPath(row.character_name, row.source_title);
  const imageUrl = row.thumbnailUrl ?? row.imageUrl;

  return (
    <ArcadeCard>
      <Link to={path} className="group flex h-full flex-col">
        <div className="relative aspect-[4/5] overflow-hidden bg-[hsl(0,0%,8%)]">
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
              <Crosshair className="h-10 w-10 text-[hsl(0,0%,18%)]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(0,0%,5%)] via-transparent to-transparent" />
        </div>
        <div className="flex flex-1 flex-col p-3">
          <div className="text-lg font-black uppercase tracking-[0.05em] text-[hsl(0,0%,97%)] group-hover:text-[hsl(var(--gold-accent))]">
            {row.character_name}
          </div>
          {row.source_title && (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[hsl(0,0%,48%)]">
              {row.source_title}
            </p>
          )}
          <div className="mt-3 inline-flex w-fit items-center gap-2 border border-[hsl(0,0%,18%)] bg-[hsl(0,0%,6%)] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[hsl(0,0%,70%)]">
            <Sparkles className="h-3.5 w-3.5" />
            {row.model_count} {row.model_count === 1 ? "modelo" : "modelos"}
          </div>
          <div className="mt-auto flex items-center gap-2 pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--gold-accent))]">
            Abrir personagem
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </Link>
    </ArcadeCard>
  );
}

export default function CatalogArcade() {
  const [searchParams] = useSearchParams();
  const activeTheme = searchParams.get("tema")?.trim().toLowerCase() ?? "";
  const activeFranchise = searchParams.get("obra")?.trim().toLowerCase() ?? "";

  const universeQuery = useQuery({
    queryKey: ["catalog-universe-index"],
    queryFn: listCatalogUniverseIndex,
  });

  const themes = universeQuery.data?.themes ?? [];
  const franchises = universeQuery.data?.franchises ?? [];
  const characters = universeQuery.data?.characters ?? [];

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
    if (!activeTheme || !activeFranchise) return [];
    return characters.filter((row) => {
      const rowTheme = franchises.find(
        (franchise) =>
          franchise.themeKey === activeTheme &&
          franchise.label.toLowerCase() ===
            String(row.source_title || currentFranchise?.label || "").trim().toLowerCase(),
      );

      if (!rowTheme) {
        return (
          String(row.source_title || "").trim().toLowerCase() ===
          String(currentFranchise?.label || "").trim().toLowerCase()
        );
      }

      return rowTheme.key === activeFranchise;
    });
  }, [activeFranchise, activeTheme, characters, currentFranchise?.label, franchises]);

  const stats = useMemo(() => {
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
  }, [activeFranchise, activeTheme, themes, visibleCharacters, visibleFranchises]);

  const breadcrumb = [
    { label: "Universo", href: PUBLIC_ROUTES.catalog },
    ...(currentTheme
      ? [{ label: currentTheme.label, href: `${PUBLIC_ROUTES.catalog}?tema=${currentTheme.key}` }]
      : []),
    ...(currentFranchise
      ? [
          {
            label: currentFranchise.label,
            href: `${PUBLIC_ROUTES.catalog}?tema=${currentTheme?.key}&obra=${currentFranchise.key}`,
          },
        ]
      : []),
  ];

  return (
    <Page
      title="Universo | ORDAX"
      description="Navegue pelo acervo em estrutura tematica, como uma arvore de pastas publicas."
      keywords={["universo", "pastas", "personagens", "modelos", "ordax"]}
    >
      <ArcadeHero
        badge="Arquivo Tematico"
        title="UNIVERSO"
        subtitle=">> PASTAS. SUBPASTAS. PERSONAGENS."
        stats={[
          { value: stats.primary, label: stats.primaryLabel },
          { value: stats.secondary, label: stats.secondaryLabel },
        ]}
      />

      <section className="relative z-10 mx-auto -mt-4 max-w-7xl px-4 md:px-6">
        <FloatingParticles />

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {breadcrumb.map((item, index) => (
            <div key={item.href} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-[hsl(0,0%,35%)]" />}
              <Link
                to={item.href}
                className={`font-mono text-[10px] uppercase tracking-[0.16em] ${
                  index === breadcrumb.length - 1
                    ? "text-[hsl(var(--gold-accent))]"
                    : "text-[hsl(0,0%,55%)] hover:text-[hsl(var(--gold-accent))]"
                }`}
              >
                {item.label}
              </Link>
            </div>
          ))}
        </div>

        {universeQuery.isLoading ? (
          <ArcadeCard hover={false} className="p-8 text-center">
            <Folder className="mx-auto mb-4 h-12 w-12 animate-pulse text-[hsl(0,0%,22%)]" />
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(0,0%,45%)]">
              Carregando estrutura do universo...
            </p>
          </ArcadeCard>
        ) : activeTheme && activeFranchise ? (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <ArcadeSectionTitle>{currentFranchise?.label || "Personagens"}</ArcadeSectionTitle>
              <div className="flex items-center gap-2">
                <Link
                  to={`${PUBLIC_ROUTES.catalog}?tema=${currentTheme?.key}`}
                  className="inline-flex items-center gap-2 border border-[hsl(0,0%,18%)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(0,0%,70%)] transition-colors hover:border-[hsl(var(--gold-accent)/0.35)] hover:text-[hsl(var(--gold-accent))]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar
                </Link>
                <Link
                  to={PUBLIC_ROUTES.characterSelect}
                  className="inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.28)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(var(--gold-accent)/0.08)]"
                >
                  Ver diretorio
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {visibleCharacters.map((row) => (
                <UniverseCharacterCard key={row.id} row={row} />
              ))}
            </div>
          </>
        ) : activeTheme ? (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <ArcadeSectionTitle>{currentTheme?.label || "Subpastas"}</ArcadeSectionTitle>
              <Link
                to={PUBLIC_ROUTES.catalog}
                className="inline-flex items-center gap-2 border border-[hsl(0,0%,18%)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(0,0%,70%)] transition-colors hover:border-[hsl(var(--gold-accent)/0.35)] hover:text-[hsl(var(--gold-accent))]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para raiz
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleFranchises.map((row) => (
                <UniverseFolderCard
                  key={`${row.themeKey}-${row.key}`}
                  title={row.label}
                  subtitle={`${row.characterCount} personagens organizados`}
                  countLabel={`${row.modelCount} modelos`}
                  imageUrl={row.thumbnailUrl ?? row.imageUrl}
                  to={`${PUBLIC_ROUTES.catalog}?tema=${row.themeKey}&obra=${row.key}`}
                  accent="franchise"
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <ArcadeSectionTitle>Pastas raiz</ArcadeSectionTitle>
              <Link
                to={PUBLIC_ROUTES.catalogModels}
                className="inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.28)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(var(--gold-accent)/0.08)]"
              >
                Feed de modelos
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {themes.map((row) => (
                <UniverseFolderCard
                  key={row.key}
                  title={row.label}
                  subtitle={`${row.franchiseCount} subpastas`}
                  countLabel={`${row.modelCount} modelos`}
                  imageUrl={row.thumbnailUrl ?? row.imageUrl}
                  to={`${PUBLIC_ROUTES.catalog}?tema=${row.key}`}
                  accent="theme"
                />
              ))}
            </div>
          </>
        )}

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <ArcadeCard hover={false} className="p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--gold-accent))]">
              Universo
            </div>
            <p className="text-sm text-[hsl(0,0%,74%)]">
              Estrutura temática em pastas e subpastas.
            </p>
          </ArcadeCard>
          <ArcadeCard hover={false} className="p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--gold-accent))]">
              Personagens
            </div>
            <p className="text-sm text-[hsl(0,0%,74%)]">
              Diretório direto por personagem, sem árvore temática.
            </p>
          </ArcadeCard>
          <ArcadeCard hover={false} className="p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--gold-accent))]">
              Modelos
            </div>
            <p className="text-sm text-[hsl(0,0%,74%)]">
              Feed plano com posts unitários, ordenável por data e nome.
            </p>
          </ArcadeCard>
        </div>
      </section>
    </Page>
  );
}
