import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Page } from "@/components/layouts/Page";
import { ArcadeCard, ArcadeHero } from "@/components/arcade/ArcadeLayout";
import {
  PUBLIC_ROUTES,
  catalogModelsPath,
  catalogUniverseFranchisePath,
} from "@/config/routes";
import { isPublicEditorialProjectionEnabled } from "@/config/catalog-editorial-projection";
import { CANONICAL_CATALOG_API_BASE } from "@/config/canonical-catalog-endpoint";
import {
  createPublicCatalogGateway,
  validCatalogSlug,
} from "@/services/catalog/public-catalog-gateway";
import { ApprovedCharacterProfile } from "@/pages/catalog/ApprovedEditorialProfiles";

function CharacterProfileState({
  title,
  message,
  returnPath = PUBLIC_ROUTES.catalogModels,
  retry,
}: {
  title: string;
  message: string;
  returnPath?: string;
  retry?: () => void;
}) {
  return (
    <Page
      title={`${title} | TONART Studio`}
      description={message}
      keywords={["TONART", "catálogo"]}
    >
      <main className="min-h-[65vh] bg-[hsl(0,0%,4%)] pb-16 text-[hsl(0,0%,94%)]">
        <ArcadeHero
          badge="FICHA EDITORIAL"
          title={title.toLocaleUpperCase("pt-BR")}
          subtitle={message}
          stats={[]}
          compact
        />
        <div className="mx-auto max-w-4xl px-4 pt-8 md:px-6">
          <ArcadeCard>
            <div className="flex flex-col items-start gap-4 p-5 sm:p-7">
              <p
                role="status"
                className="text-sm leading-relaxed text-[hsl(0,0%,72%)]"
              >
                {message}
              </p>
              {retry ? (
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex min-h-11 items-center justify-center border border-[hsl(var(--gold-accent)/0.5)] px-4 py-2 text-sm text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Tentar novamente
                </button>
              ) : null}
              <Link
                to={returnPath}
                className="inline-flex min-h-11 items-center gap-2 text-sm text-[hsl(var(--gold-accent))] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <ArrowLeft size={16} aria-hidden="true" /> Voltar ao catálogo
              </Link>
            </div>
          </ArcadeCard>
        </div>
      </main>
    </Page>
  );
}

export default function CatalogCharacterArcade() {
  const { themeKey, franchiseKey } = useParams<{
    themeKey?: string;
    franchiseKey?: string;
  }>();
  if (!isPublicEditorialProjectionEnabled()) {
    // Preserve legacy links until the approved Worker projection is released.
    return (
      <Navigate
        to={catalogModelsPath(themeKey, franchiseKey)}
        replace
      />
    );
  }
  return <EnabledCharacterProfileRoute />;
}

function EnabledCharacterProfileRoute() {
  const { slug, themeKey, franchiseKey, characterSlug } = useParams<{
    slug?: string;
    themeKey?: string;
    franchiseKey?: string;
    characterSlug?: string;
  }>();
  const requestedSlug = characterSlug ?? slug ?? "";
  const returnPath =
    themeKey && franchiseKey
      ? catalogUniverseFranchisePath(themeKey, franchiseKey)
      : PUBLIC_ROUTES.catalogModels;
  const gateway = useMemo(() => {
    if (!CANONICAL_CATALOG_API_BASE) return null;
    try {
      return createPublicCatalogGateway(CANONICAL_CATALOG_API_BASE, fetch);
    } catch {
      return null;
    }
  }, []);
  const query = useQuery({
    queryKey: [
      "tonecos-editorial-character",
      requestedSlug,
      themeKey,
      franchiseKey,
    ],
    queryFn: ({ signal }) =>
      gateway!.getCharacterProfile(
        requestedSlug,
        signal,
        themeKey && franchiseKey
          ? { categorySlug: themeKey, franchiseSlug: franchiseKey }
          : undefined,
      ),
    enabled: gateway !== null && validCatalogSlug(requestedSlug),
    retry: false,
    staleTime: 15 * 60 * 1000,
  });

  if (!validCatalogSlug(requestedSlug)) {
    return (
      <CharacterProfileState
        title="Ficha indisponível"
        message="O endereço desta ficha não é válido."
        returnPath={returnPath}
      />
    );
  }
  if (!gateway) {
    return (
      <CharacterProfileState
        title="Ficha indisponível"
        message="O catálogo público não está configurado para carregar fichas editoriais."
        returnPath={returnPath}
      />
    );
  }
  if (query.isPending) {
    return (
      <CharacterProfileState
        title="Carregando ficha"
        message="Consultando a projeção editorial pública aprovada…"
        returnPath={returnPath}
      />
    );
  }
  if (query.isError || !query.data) {
    return (
      <CharacterProfileState
        title="Ficha não publicada"
        message="Esta ficha ainda não está disponível na projeção editorial pública aprovada. Você pode voltar ao catálogo ou tentar novamente."
        returnPath={returnPath}
        retry={() => void query.refetch()}
      />
    );
  }

  return <ApprovedCharacterProfile profile={query.data} gateway={gateway} />;
}
