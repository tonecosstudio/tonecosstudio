import { useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { CanonicalCatalogImage } from "@/components/catalog/CanonicalCatalogImage";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeCard,
  ArcadeSectionTitle,
} from "@/components/arcade/ArcadeLayout";
import { PUBLIC_ROUTES } from "@/config/routes";
import { useCatalogBrowsing } from "@/services/catalog/catalog-browsing-context";
import {
  MAX_CANONICAL_SELECTION,
  toggleCanonicalSelection,
} from "@/services/catalog/public-catalog-selection";
import { CANONICAL_CATALOG_API_BASE } from "@/config/canonical-catalog-endpoint";
import {
  createPublicCatalogGateway,
  type PublicCatalogImage,
} from "@/services/catalog/public-catalog-gateway";

const API_BASE = CANONICAL_CATALOG_API_BASE;

/** Restore only known first-party catalog filters from navigation state. */
function catalogReturnPath(state: unknown): string {
  const base = PUBLIC_ROUTES.catalogModels;
  if (!state || typeof state !== "object" || Array.isArray(state)) return base;
  const values = state as Record<string, unknown>;
  const universe = values.catalogReturnUniverse;
  if (universe && typeof universe === "object" && !Array.isArray(universe)) {
    const scope = universe as Record<string, unknown>;
    const validSlug = (value: unknown): value is string =>
      typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,239}$/.test(value);

    if (validSlug(scope.category) && validSlug(scope.franchise)) {
      const folder = scope.folder;
      if (
        folder !== undefined &&
        (typeof folder !== "string" ||
          folder.length > 240 ||
          Array.from(folder).some((part) => part.charCodeAt(0) < 32 || part.charCodeAt(0) === 127) ||
          folder.split("\\").join("/").split("/").some((part) => part === "." || part === ".."))
      ) {
        return base;
      }
      const route = `${PUBLIC_ROUTES.catalog}/${scope.category}/${scope.franchise}`;
      return typeof folder === "string" && folder
        ? route + "?" + new URLSearchParams({ folder }).toString()
        : route;
    }
  }
  const raw = values.catalogReturnSearch;
  if (typeof raw !== "string" || raw.length > 1024) return base;
  const source = new URLSearchParams(raw);
  const filters = new URLSearchParams();
  for (const key of ["q", "category", "franchise", "folder"] as const) {
    const values = source.getAll(key);
    if (values.length > 1) return base;
    const value = values[0]?.trim();
    if (value) filters.set(key, value);
  }
  if (filters.has("folder") && (!filters.has("category") || !filters.has("franchise"))) {
    filters.delete("folder");
  }
  const search = filters.toString();
  return search ? `${base}?${search}` : base;
}


export default function CanonicalModelDetails() {
  const { id: slug } = useParams<{ id: string }>();
  const location = useLocation();
  const catalogReturnTo = catalogReturnPath(location.state);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const { selectedModels, setSelectedModels } = useCatalogBrowsing();
  const gateway = useMemo(() => {
    if (!API_BASE) return null;
    try {
      return createPublicCatalogGateway(API_BASE, fetch);
    } catch {
      return null;
    }
  }, []);

  const modelQuery = useQuery({
    queryKey: ["tonecos-catalog-detail", slug],
    queryFn: ({ signal }) => gateway!.getModel(slug!, signal),
    enabled: gateway !== null && Boolean(slug),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const model = modelQuery.data;
  const isSelected = Boolean(
    model && selectedModels.some((entry) => entry.id === model.id),
  );
  const galleryQuery = useInfiniteQuery({
    queryKey: ["tonecos-catalog-gallery", model?.slug, model?.galleryVersion],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) =>
      gateway!.listGallery(
        model!.slug,
        {
          version: model!.galleryVersion,
          limit: 24,
          cursor: pageParam || undefined,
          expectedTotal: model!.imageCount,
          expectedCoverStorageKey: model!.coverStorageKey,
        },
        signal,
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled:
      gateway !== null && model !== undefined && model.galleryVersion > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const images = galleryQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const activeImage =
    images.find((image) => image.id === activeImageId) ?? images[0] ?? null;
  const activeImageKey = activeImage
    ? (activeImage.variantKeys.detail ??
      activeImage.variantKeys.card ??
      activeImage.variantKeys.thumb)
    : (model?.coverStorageKey ?? null);
  const activeImageUrl = gateway?.mediaUrl(activeImageKey) ?? null;

  function imageUrl(image: PublicCatalogImage): string | null {
    return gateway?.mediaUrl(
      image.variantKeys.thumb ??
        image.variantKeys.card ??
        image.variantKeys.detail,
    ) ?? null;
  }

  return (
    <Page
      title={model ? model.name + " — Tonecos Studio" : "Ficha do modelo"}
      description={
        model?.description ??
        "Ficha do modelo publicado no catálogo Tonecos Studio."
      }
      keywords={
        model
          ? [model.name, model.category, model.franchise, "Tonecos Studio"]
          : ["Tonecos Studio", "modelo"]
      }
    >
      <main className="min-h-[80vh] bg-[hsl(0,0%,4%)] px-4 py-8 text-[hsl(0,0%,94%)] md:px-8 md:py-12">
        <div className="mx-auto max-w-7xl">
          <Link
            to={catalogReturnTo}
            className="inline-flex min-h-11 items-center gap-2 rounded-none text-sm font-medium text-[hsl(var(--gold-accent))] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <ArrowLeft aria-hidden="true" size={17} />
            {catalogReturnTo.startsWith(PUBLIC_ROUTES.catalog + "/")
              ? "Voltar à pasta"
              : "Voltar ao catálogo"}
          </Link>

          {gateway === null || !slug ? (
            <section className="mt-8 rounded-none border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] p-6">
              <h1 className="text-2xl font-medium">Ficha indisponível</h1>
              <p role="alert" className="mt-2 text-sm text-[hsl(0,0%,56%)]">
                A origem do catálogo Tonecos ainda não está configurada para
                este ambiente.
              </p>
            </section>
          ) : modelQuery.isPending ? (
            <p role="status" className="mt-8 text-sm text-[hsl(0,0%,56%)]">
              Carregando ficha do modelo…
            </p>
          ) : modelQuery.isError || !model ? (
            <section className="mt-8 rounded-none border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] p-6">
              <h1 className="text-2xl font-medium">Ficha indisponível</h1>
              <p role="alert" className="mt-2 text-sm text-[hsl(0,0%,56%)]">
                Não foi possível carregar este modelo publicado. Tente novamente
                mais tarde.
              </p>
              <button
                type="button"
                onClick={() => void modelQuery.refetch()}
                className="mt-4 min-h-11 rounded-none border border-[hsl(0,0%,15%)] px-4 text-sm font-medium hover:bg-[hsl(0,0%,9%)]"
              >
                Tentar novamente
              </button>
            </section>
          ) : (
            <article className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <section aria-label="Imagens do modelo">
                <ArcadeCard className="flex min-h-[360px] items-center justify-center md:min-h-[560px]">
                  <CanonicalCatalogImage
                    src={activeImageUrl}
                    alt={"Referência visual de " + model.name}
                    imageClassName="max-h-[75vh] w-full object-contain p-4"
                    loading="eager"
                  />
                </ArcadeCard>

                {model.galleryVersion > 0 && galleryQuery.isPending ? (
                  <p
                    role="status"
                    className="mt-4 text-sm text-[hsl(0,0%,56%)]"
                  >
                    Carregando galeria…
                  </p>
                ) : galleryQuery.isError ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p role="alert" className="text-sm text-[hsl(0,0%,56%)]">
                      A galeria não pôde ser carregada.
                    </p>
                    <button
                      type="button"
                      onClick={() => void galleryQuery.refetch()}
                      className="min-h-11 rounded-none border border-[hsl(0,0%,15%)] px-4 text-sm font-medium"
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : images.length > 0 ? (
                  <>
                    <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
                      {images.map((image, index) => {
                        const src = imageUrl(image);
                        return (
                          <button
                            key={image.id}
                            type="button"
                            onClick={() => setActiveImageId(image.id)}
                            aria-label={
                              "Ver imagem " + (index + 1) + " de " + model.name
                            }
                            aria-pressed={activeImage?.id === image.id}
                            className="aspect-square overflow-hidden rounded-none border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))] aria-pressed:border-[hsl(var(--gold-accent))]"
                          >
                            <CanonicalCatalogImage
                              src={src}
                              alt=""
                              imageClassName="h-full w-full object-cover"
                              fallbackLabel="Sem prévia"
                            />
                          </button>
                        );
                      })}
                    </div>
                    {galleryQuery.hasNextPage ? (
                      <button
                        type="button"
                        onClick={() => void galleryQuery.fetchNextPage()}
                        disabled={galleryQuery.isFetchingNextPage}
                        className="mt-4 min-h-11 rounded-none border border-[hsl(0,0%,15%)] px-4 text-sm font-medium hover:bg-[hsl(0,0%,9%)] disabled:opacity-60"
                      >
                        {galleryQuery.isFetchingNextPage
                          ? "Carregando…"
                          : "Carregar mais imagens"}
                      </button>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-4 text-sm text-[hsl(0,0%,56%)]">
                    Nenhuma imagem publicada nesta galeria.
                  </p>
                )}
              </section>

              <ArcadeCard className="self-start p-5 md:p-7">
                <div className="space-y-6">
                  <header>
                    <ArcadeSectionTitle>FICHA DO MODELO</ArcadeSectionTitle>
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--gold-accent))]">
                      {model.category} · {model.franchise}
                    </p>
                    <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] leading-tight md:text-4xl">
                      {model.name}
                    </h1>
                    {model.variantName ? (
                      <p className="mt-2 text-base text-[hsl(0,0%,56%)]">
                        {model.variantName}
                      </p>
                    ) : null}
                  </header>

                  {model.description ? (
                    <p className="whitespace-pre-line leading-relaxed text-[hsl(0,0%,56%)]">
                      {model.description}
                    </p>
                  ) : null}

                  <dl className="grid grid-cols-2 gap-3 border-y border-[hsl(0,0%,15%)] py-5 text-sm">
                    <div>
                      <dt className="text-[hsl(0,0%,56%)]">Código</dt>
                      <dd className="mt-1 font-medium">{model.code}</dd>
                    </div>
                    {model.material ? (
                      <div>
                        <dt className="text-[hsl(0,0%,56%)]">Material</dt>
                        <dd className="mt-1 font-medium">{model.material}</dd>
                      </div>
                    ) : null}
                    {model.heightCm !== null ? (
                      <div>
                        <dt className="text-[hsl(0,0%,56%)]">
                          Altura informada
                        </dt>
                        <dd className="mt-1 font-medium">
                          {model.heightCm} cm
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-[hsl(0,0%,56%)]">
                        Imagens publicadas
                      </dt>
                      <dd className="mt-1 font-medium">
                        {galleryQuery.isError
                          ? "Indisponível"
                          : galleryQuery.data?.pages[0]?.total ??
                            (model.galleryVersion > 0
                              ? "Verificando…"
                              : "Indisponível")}
                      </dd>
                    </div>
                  </dl>

                  <p className="text-sm leading-relaxed text-[hsl(0,0%,56%)]">
                    Disponibilidade e preço são confirmados pela equipe na etapa
                    de orçamento. Esta ficha apresenta somente os dados
                    publicados no catálogo.
                  </p>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedModels((current) =>
                          toggleCanonicalSelection(current, model),
                        )
                      }
                      aria-pressed={isSelected}
                      disabled={
                        !isSelected &&
                        selectedModels.length >= MAX_CANONICAL_SELECTION
                      }
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-none border border-[hsl(var(--gold-accent))] px-4 py-3 text-sm font-semibold text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(0,0%,9%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSelected
                        ? "Remover da seleção"
                        : "Adicionar à seleção"}
                    </button>
                    <p
                      role="status"
                      aria-live="polite"
                      className="text-xs text-[hsl(0,0%,56%)]"
                    >
                      Minha seleção: {selectedModels.length} de{" "}
                      {MAX_CANONICAL_SELECTION} modelos. Nenhum pedido é enviado
                      automaticamente.
                    </p>
                  </div>
                </div>
              </ArcadeCard>
            </article>
          )}
        </div>
      </main>
    </Page>
  );
}
