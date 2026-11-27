import {
  Suspense,
  lazy,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { CanonicalCatalogImage } from "@/components/catalog/CanonicalCatalogImage";
import { CatalogImageDownload } from "@/components/catalog/CatalogImageDownload";
import {
  catalogModelDisplayName,
  catalogTagLabel,
  catalogTagSearchParams,
  CatalogFilterTag,
  visibleCatalogTags,
} from "@/components/catalog/CatalogTaxonomy";
import { RelatedModels, relatedCatalogReturnState } from "./RelatedModels";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeCard,
  ArcadeSectionTitle,
} from "@/components/arcade/ArcadeLayout";
import { PUBLIC_ROUTES } from "@/config/routes";
import {
  CATALOG_BROWSING_SCOPE_KEYS,
  catalogBrowsingScope,
  useCatalogBrowsing,
} from "@/services/catalog/catalog-browsing-context";
import {
  MAX_CANONICAL_SELECTION,
  toggleCanonicalSelection,
} from "@/services/catalog/public-catalog-selection";
import { CANONICAL_CATALOG_API_BASE } from "@/config/canonical-catalog-endpoint";
import {
  isCatalogMediaUnderReview,
  isCatalogPublicMvpEnabled,
} from "@/config/catalog-public-mvp";
import {
  findApprovedPublicRender,
  isApprovedPublicCover,
} from "@/services/catalog/approved-public-renders";
import {
  createPublicCatalogGateway,
  validCatalogFolder,
  validCatalogSlug,
  type PublicCatalogDetail,
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
    if (
      typeof scope.category === "string" &&
      validCatalogSlug(scope.category) &&
      typeof scope.franchise === "string" &&
      validCatalogSlug(scope.franchise)
    ) {
      const folder = scope.folder;
      if (
        folder !== undefined &&
        (typeof folder !== "string" || !validCatalogFolder(folder))
      ) {
        return base;
      }
      const route = `${PUBLIC_ROUTES.catalog}/${scope.category}/${scope.franchise}`;
      return typeof folder === "string" && folder
        ? route + "?" + new URLSearchParams({ folder }).toString()
        : route;
    }
    return base;
  }
  const raw = values.catalogReturnSearch;
  if (typeof raw !== "string" || raw.length > 1024) return base;
  const source = new URLSearchParams(raw);
  const filters = new URLSearchParams();
  for (const key of CATALOG_BROWSING_SCOPE_KEYS) {
    const values = source.getAll(key);
    if (values.length > 1) return base;
    const value = values[0]?.trim();
    if (value) filters.set(key, value);
  }
  const intentValues = source.getAll("tipo");
  if (intentValues.length > 1) return base;
  if (intentValues[0] === "pre-venda") filters.set("tipo", "pre-venda");
  const query = filters.get("q");
  const queryLength = query ? Array.from(query).length : 0;
  if (query && (queryLength < 3 || queryLength > 80)) return base;
  const category = filters.get("category");
  const franchise = filters.get("franchise");
  const folder = filters.get("folder");
  if (category && category !== "all" && !validCatalogSlug(category))
    return base;
  if (franchise && !validCatalogSlug(franchise)) return base;
  if (folder && (!category || !franchise || !validCatalogFolder(folder)))
    return base;
  const characterId = filters.get("character_id");
  const attributeId = filters.get("attribute_id");
  if (
    (characterId && !/^[A-Za-z0-9_-]{3,100}$/.test(characterId)) ||
    (attributeId && !/^[A-Za-z0-9_-]{3,100}$/.test(attributeId)) ||
    (characterId && attributeId)
  )
    return base;
  const search = filters.toString();
  return search ? `${base}?${search}` : base;
}

function shouldRequestPreorder(state: unknown): boolean {
  if (!state || typeof state !== "object" || Array.isArray(state)) return false;
  const raw = (state as Record<string, unknown>).catalogReturnSearch;
  if (typeof raw !== "string" || raw.length > 1024) return false;
  const params = new URLSearchParams(raw);
  return (
    params.getAll("tipo").length === 1 && params.get("tipo") === "pre-venda"
  );
}

/** Use only a bounded same-page snapshot for adjacent-model links. */
function adjacentCatalogModels(
  state: unknown,
  current: string | undefined,
  returnPath: string,
): {
  previous: string | null;
  next: string | null;
} {
  const absent = { previous: null, next: null };
  if (
    !current ||
    !validCatalogSlug(current) ||
    !state ||
    typeof state !== "object" ||
    Array.isArray(state)
  )
    return absent;
  const values = state as Record<string, unknown>;
  // Catalog pages and Universe folders have separate validated navigation
  // scopes, but reuse the same algorithm and never fetch adjacent pages.
  const fromUniverse = values.catalogReturnUniverse !== undefined;
  if (fromUniverse) {
    if (
      !returnPath.startsWith(PUBLIC_ROUTES.catalog + "/") ||
      values.catalogSiblingSlugs !== undefined
    )
      return absent;
  } else if (values.universeSiblingSlugs !== undefined) return absent;
  const entries = fromUniverse
    ? values.universeSiblingSlugs
    : values.catalogSiblingSlugs;
  const maximum = fromUniverse ? 8 : 36;
  if (
    !Array.isArray(entries) ||
    entries.length < 2 ||
    entries.length > maximum ||
    !entries.every(
      (item): item is string =>
        typeof item === "string" && validCatalogSlug(item),
    )
  )
    return absent;
  if (new Set(entries).size !== entries.length) return absent;
  const index = entries.indexOf(current);
  if (index < 0) return absent;
  return {
    previous: index > 0 ? entries[index - 1] : null,
    next: index + 1 < entries.length ? entries[index + 1] : null,
  };
}

export default function CanonicalModelDetails() {
  // The commercial-only module must not be bundled into the public app.
  // Resolve at render-time so commercial tests can set the mode before mount.
  const CommercialOfferDetails = useMemo(
    () =>
      import.meta.env.VITE_TONECOS_COMMERCIAL_MVP === "true"
        ? lazy(() =>
            import("@/components/catalog/TonartCommercialOfferDetails").then(
              ({ TonartCommercialOfferDetails }) => ({
                default: TonartCommercialOfferDetails,
              }),
            ),
          )
        : null,
    [],
  );
  const { id: slug } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const catalogReturnTo = catalogReturnPath(location.state);
  const quoteRequestPath =
    PUBLIC_ROUTES.quoteRequest +
    (shouldRequestPreorder(location.state) ? "?tipo=pre-venda" : "");
  const adjacentModels = adjacentCatalogModels(
    location.state,
    slug,
    catalogReturnTo,
  );
  const previousRelatedModel =
    location.state &&
    typeof location.state === "object" &&
    !Array.isArray(location.state) &&
    typeof (location.state as Record<string, unknown>).catalogRelatedFrom ===
      "string"
      ? (location.state as Record<string, string>).catalogRelatedFrom
      : null;
  const backToRelatedModel =
    previousRelatedModel &&
    validCatalogSlug(previousRelatedModel) &&
    previousRelatedModel !== slug
      ? previousRelatedModel
      : null;
  // React Router retains the old scroll position between detail links.
  // A recommendation is opened from near the foot of the previous page:
  // start the new model at the top, without affecting normal back/catalog flow.
  useEffect(() => {
    if (!backToRelatedModel) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [backToRelatedModel, slug]);
  const relatedModelTitleRef = useRef<HTMLHeadingElement>(null);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const galleryKeyboardHelpId = useId();
  const quoteRequestsEnabled =
    import.meta.env.VITE_TONECOS_COMMERCIAL_MVP === "true" &&
    import.meta.env.VITE_PREVIEW_READ_ONLY !== "true" &&
    !isCatalogPublicMvpEnabled();
  const {
    selectedModels,
    setSelectedModels,
    setPaging,
    setUniverseReturnFocus,
  } = useCatalogBrowsing();
  // Record the return target AFTER navigation, not on the outgoing link:
  // otherwise a same-turn render can consume it before the list unmounts.
  // Catalog return filters were already validated by catalogReturnPath.
  useEffect(() => {
    if (
      !slug ||
      !validCatalogSlug(slug) ||
      !location.state ||
      typeof location.state !== "object" ||
      Array.isArray(location.state)
    )
      return;
    const raw = (location.state as Record<string, unknown>).catalogReturnSearch;
    if (
      typeof raw !== "string" ||
      raw.length > 1024 ||
      !catalogReturnTo.startsWith(PUBLIC_ROUTES.catalogModels)
    )
      return;
    const params = new URLSearchParams(catalogReturnTo.split("?")[1] ?? "");
    const scope = catalogBrowsingScope(params);
    setPaging((current) => {
      if (current.scope === scope && current.returnFocusSlug === slug)
        return current;
      return current.scope === scope
        ? { ...current, returnFocusSlug: slug }
        : { scope, cursors: [undefined], index: 0, returnFocusSlug: slug };
    });
  }, [slug, location.state, catalogReturnTo, setPaging]);
  // Preserve the visited Universe preview card in the SAME in-memory
  // browsing context. Capture only a validated first-party folder route,
  // after the detail has mounted (not on the outgoing preview Link).
  useEffect(() => {
    if (
      !slug ||
      !validCatalogSlug(slug) ||
      !catalogReturnTo.startsWith(PUBLIC_ROUTES.catalog + "/") ||
      !location.state ||
      typeof location.state !== "object" ||
      Array.isArray(location.state) ||
      !(location.state as Record<string, unknown>).catalogReturnUniverse
    )
      return;
    setUniverseReturnFocus((current) =>
      current?.path === catalogReturnTo && current.slug === slug
        ? current
        : { path: catalogReturnTo, slug },
    );
  }, [slug, location.state, catalogReturnTo, setUniverseReturnFocus]);
  const gateway = useMemo(() => {
    if (!API_BASE) return null;
    try {
      return createPublicCatalogGateway(API_BASE, fetch);
    } catch {
      return null;
    }
  }, []);

  const mediaUnderReview = isCatalogMediaUnderReview();
  const publicMediaHold =
    mediaUnderReview &&
    isCatalogPublicMvpEnabled() &&
    import.meta.env.VITE_PREVIEW_READ_ONLY === "true";
  const publicationBlocked = publicMediaHold && !findApprovedPublicRender(slug);
  const modelQuery = useQuery({
    queryKey: ["tonecos-catalog-detail", slug],
    queryFn: ({ signal }) => gateway!.getModel(slug!, signal),
    enabled: gateway !== null && Boolean(slug) && !publicationBlocked,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const model = modelQuery.data;

  const coverReleased = Boolean(model && isApprovedPublicCover(model));
  // Navigation from a related card is a new detail view. Announce its
  // heading to keyboard/screen-reader users after the detail has loaded.
  // Do not steal focus on a normal catalog return or a data refetch.
  useEffect(() => {
    if (backToRelatedModel && model?.slug === slug) {
      relatedModelTitleRef.current?.focus({ preventScroll: true });
    }
  }, [backToRelatedModel, model?.slug, slug]);
  const imageUnderReview =
    modelQuery.isError &&
    modelQuery.error instanceof Error &&
    modelQuery.error.message === "catalog_model_media_restricted";
  const isSelected = Boolean(
    model && selectedModels.some((entry) => entry.id === model.id),
  );
  const selectionAtCapacity =
    !isSelected && selectedModels.length >= MAX_CANONICAL_SELECTION;
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
    // Prevent a non-adjacent cursor cycle (A → B → A) without new state.
    getNextPageParam: (lastPage, pages, _lastParam, pageParams) => {
      // The published total is authoritative. A stale extra cursor must not
      // trigger another Worker request once all images have been received.
      const received = pages.reduce((sum, page) => sum + page.items.length, 0);
      if (received >= lastPage.total) return undefined;
      const next = lastPage.nextCursor;
      return next && !pageParams.includes(next) ? next : undefined;
    },
    enabled:
      !mediaUnderReview &&
      gateway !== null &&
      model !== undefined &&
      model.galleryVersion > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const galleryData = galleryQuery.data;
  // Identity is validated within each response by the gateway. The UI is
  // the only place with all fetched pages, so verify cross-page uniqueness
  // before presenting any thumbnails or provisional gallery counts.
  const seenGalleryIds = new Set<string>();
  const duplicateGalleryIdentity = Boolean(
    galleryData?.pages.some((page) =>
      page.items.some((image) => {
        if (seenGalleryIds.has(image.id)) return true;
        seenGalleryIds.add(image.id);
        return false;
      }),
    ),
  );
  const receivedGalleryCount =
    galleryData?.pages.reduce((sum, page) => sum + page.items.length, 0) ?? 0;
  const publishedGalleryTotal = galleryData?.pages[0]?.total;
  const lastGalleryPage = galleryData?.pages[galleryData.pages.length - 1];
  const inconsistentGalleryCount = Boolean(
    galleryData &&
    publishedGalleryTotal !== undefined &&
    (receivedGalleryCount > publishedGalleryTotal ||
      galleryData.pages.some((page) => page.total !== publishedGalleryTotal) ||
      (receivedGalleryCount < publishedGalleryTotal &&
        lastGalleryPage?.nextCursor === null)),
  );
  const images =
    duplicateGalleryIdentity || inconsistentGalleryCount
      ? []
      : (galleryData?.pages.flatMap((page) => page.items) ?? []);
  const galleryCursorCycle = Boolean(
    galleryData?.pages.some(
      (page) =>
        page.nextCursor !== null &&
        galleryData.pageParams.includes(page.nextCursor),
    ),
  );
  const activeImage =
    images.find((image) => image.id === activeImageId) ?? images[0] ?? null;
  const activeImageIndex = activeImage
    ? images.findIndex((image) => image.id === activeImage.id)
    : -1;
  function moveGalleryImage(direction: -1 | 1) {
    if (images.length < 2 || activeImageIndex < 0) return;
    const nextIndex =
      (activeImageIndex + direction + images.length) % images.length;
    setActiveImageId(images[nextIndex].id);
  }
  function handleGalleryKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (
      images.length < 2 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

    // For focused thumbnails use their position; navigation controls use the
    // selected image. The handler is attached only inside this gallery.
    const focusedThumbnail = (
      event.target as HTMLElement
    ).closest<HTMLButtonElement>("button[data-gallery-thumbnail]");
    const fromIndex = focusedThumbnail
      ? Number(focusedThumbnail.dataset.galleryIndex)
      : activeImageIndex;
    if (
      !Number.isInteger(fromIndex) ||
      fromIndex < 0 ||
      fromIndex >= images.length
    )
      return;
    const targetIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? images.length - 1
          : (fromIndex +
              (event.key === "ArrowRight" ? 1 : -1) +
              images.length) %
            images.length;
    event.preventDefault();
    setActiveImageId(images[targetIndex].id);
    // Roving focus within the thumbnail grid; no focus jumps when the user
    // operates the previous/next buttons or other controls.
    if (focusedThumbnail) {
      const thumbnails =
        event.currentTarget.querySelectorAll<HTMLButtonElement>(
          "button[data-gallery-thumbnail]",
        );
      thumbnails[targetIndex]?.focus();
    }
  }
  const activeImageKey = activeImage
    ? (activeImage.variantKeys.detail ??
      activeImage.variantKeys.card ??
      activeImage.variantKeys.thumb)
    : (model?.coverStorageKey ?? null);
  const activeImageUrl = gateway?.mediaUrl(activeImageKey) ?? null;
  const activeImageFallbackKey = activeImage
    ? ([activeImage.variantKeys.card, activeImage.variantKeys.thumb].find(
        (key) => key && key !== activeImageKey,
      ) ?? null)
    : null;
  const activeImageFallbackUrl =
    gateway?.mediaUrl(activeImageFallbackKey) ?? null;

  function thumbnailFallbackUrl(image: PublicCatalogImage): string | null {
    // A missing thumbnail may use the published card variant. No unrelated
    // fallback photos or remote storage probes are permitted.
    return image.variantKeys.thumb
      ? (gateway?.mediaUrl(
          image.variantKeys.card ?? image.variantKeys.detail,
        ) ?? null)
      : null;
  }

  function imageUrl(image: PublicCatalogImage): string | null {
    return (
      gateway?.mediaUrl(
        image.variantKeys.thumb ??
          image.variantKeys.card ??
          image.variantKeys.detail,
      ) ?? null
    );
  }

  const displayName = model ? catalogModelDisplayName(model) : "";
  const detailTags = model
    ? visibleCatalogTags(model.tags ?? []).map((tag) => ({
        key: tag.kind + ":" + tag.id,
        kind: tag.kind,
        label: catalogTagLabel(tag.label),
        provisional: tag.provisional,
        onClick: () => {
          navigate(
            PUBLIC_ROUTES.catalogModels +
              "?" +
              catalogTagSearchParams(model, tag).toString(),
          );
        },
      }))
    : [];

  // Direct links cannot bypass the public visual publication embargo.
  if (publicationBlocked) {
    return (
      <Page
        title="Modelo indisponível — TONART Studio"
        description="Esta referência não está disponível para consulta no momento."
      >
        <section className="min-h-[70svh] bg-[hsl(0,0%,4%)] px-4 py-16 text-[hsl(0,0%,94%)] sm:px-8">
          <div
            role="status"
            className="mx-auto max-w-2xl border-l-2 border-[hsl(var(--gold-accent))] bg-[hsl(0,0%,7%)] p-7 sm:p-10"
          >
            <h1 className="text-2xl font-semibold uppercase tracking-wide">
              Modelo indisponível
            </h1>
            <p className="mt-5 text-sm leading-7 text-[hsl(0,0%,73%)]">
              Este modelo não está disponível para consulta no momento. Explore
              as demais referências do acervo.
            </p>
            <Link
              to={PUBLIC_ROUTES.catalogModels}
              className="mt-7 inline-flex min-h-11 items-center gap-2 border border-[hsl(var(--gold-accent))] px-5 text-sm font-semibold text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)]"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Voltar ao acervo
            </Link>
          </div>
        </section>
      </Page>
    );
  }

  return (
    <Page
      title={model ? displayName + " — TONART Studio" : "Ficha do modelo"}
      description={
        model?.description ??
        "Ficha do modelo publicado no catálogo TONART Studio."
      }
      keywords={
        model
          ? [displayName, model.category, model.franchise, "TONART Studio"]
          : ["TONART Studio", "modelo"]
      }
    >
      <div className="min-h-[80vh] bg-[hsl(0,0%,4%)] px-4 py-8 text-[hsl(0,0%,94%)] md:px-8 md:py-12">
        <div className="mx-auto max-w-7xl">
          <nav
            aria-label="Navegação da ficha"
            className="flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            <Link
              to={catalogReturnTo}
              className="inline-flex min-h-11 items-center gap-2 rounded-none text-sm font-medium text-[hsl(var(--gold-accent))] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <ArrowLeft aria-hidden="true" size={17} />
              {catalogReturnTo.startsWith(PUBLIC_ROUTES.catalog + "/")
                ? "Voltar à pasta"
                : "Voltar ao catálogo"}
            </Link>
            {backToRelatedModel ? (
              <Link
                to={PUBLIC_ROUTES.catalogModels + "/" + backToRelatedModel}
                state={relatedCatalogReturnState(catalogReturnTo)}
                className="inline-flex min-h-11 items-center gap-2 text-sm text-[hsl(0,0%,70%)] hover:text-[hsl(var(--gold-accent))] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                <ArrowLeft aria-hidden="true" size={16} />
                Voltar ao modelo anterior
              </Link>
            ) : null}
          </nav>
          {adjacentModels.previous || adjacentModels.next ? (
            <nav
              aria-label={
                catalogReturnTo.startsWith(PUBLIC_ROUTES.catalog + "/")
                  ? "Navegação entre modelos desta pasta do Universo"
                  : "Navegação entre modelos desta página do catálogo"
              }
              className="mt-3 flex flex-wrap gap-3 text-sm"
            >
              {adjacentModels.previous ? (
                <Link
                  to={
                    PUBLIC_ROUTES.catalogModels + "/" + adjacentModels.previous
                  }
                  state={location.state}
                  className="inline-flex min-h-11 items-center gap-2 border border-[hsl(0,0%,20%)] px-4 hover:bg-[hsl(0,0%,10%)]"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Modelo anterior
                </Link>
              ) : null}
              {adjacentModels.next ? (
                <Link
                  to={PUBLIC_ROUTES.catalogModels + "/" + adjacentModels.next}
                  state={location.state}
                  className="inline-flex min-h-11 items-center gap-2 border border-[hsl(0,0%,20%)] px-4 hover:bg-[hsl(0,0%,10%)]"
                >
                  Próximo modelo
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              ) : null}
            </nav>
          ) : null}

          {gateway === null || !slug ? (
            <section className="mt-8 rounded-none border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] p-6">
              <h1 className="text-2xl font-medium">Ficha indisponível</h1>
              <p role="alert" className="mt-2 text-sm text-[hsl(0,0%,56%)]">
                Não foi possível acessar o catálogo agora. Tente novamente mais
                tarde.
              </p>
            </section>
          ) : modelQuery.isPending ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:gap-8">
              <p role="status" className="sr-only">
                Carregando ficha do modelo…
              </p>
              <div
                aria-hidden="true"
                className="min-h-[clamp(18rem,58svh,30rem)] animate-pulse border border-[hsl(0,0%,15%)] bg-[radial-gradient(ellipse_at_center,hsl(0_0%_13%),hsl(0_0%_7%)_72%)] motion-reduce:animate-none"
              />
              <div
                aria-hidden="true"
                className="space-y-5 border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] p-5 md:p-7"
              >
                <div className="h-3 w-2/5 animate-pulse bg-[hsl(0,0%,14%)] motion-reduce:animate-none" />
                <div className="h-10 w-4/5 animate-pulse bg-[hsl(0,0%,12%)] motion-reduce:animate-none" />
                <div className="h-20 animate-pulse bg-[hsl(0,0%,10%)] motion-reduce:animate-none" />
                <div className="h-24 animate-pulse bg-[hsl(0,0%,10%)] motion-reduce:animate-none" />
              </div>
            </div>
          ) : modelQuery.isError || !model ? (
            <section className="mt-8 rounded-none border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] p-6">
              <h1 className="text-2xl font-medium">
                {imageUnderReview
                  ? "Modelo indisponível"
                  : "Ficha indisponível"}
              </h1>
              <p role="alert" className="mt-2 text-sm text-[hsl(0,0%,56%)]">
                {imageUnderReview
                  ? "Esta referência não está disponível no momento. Explore os demais modelos do catálogo."
                  : "Não foi possível carregar este modelo publicado. Tente novamente mais tarde."}
              </p>
              {!imageUnderReview ? (
                <button
                  type="button"
                  onClick={() => void modelQuery.refetch()}
                  className="mt-4 min-h-11 rounded-none border border-[hsl(0,0%,15%)] px-4 text-sm font-medium hover:bg-[hsl(0,0%,9%)]"
                >
                  Tentar novamente
                </button>
              ) : null}
            </section>
          ) : (
            <>
              <article className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <section aria-label="Imagens do modelo">
                  <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--gold-accent))]">
                    Galeria do modelo
                  </h2>
                  {mediaUnderReview && !coverReleased ? (
                    <p className="mb-4 border-l-2 border-[hsl(var(--gold-accent)/0.5)] pl-4 text-sm text-[hsl(0,0%,72%)]">
                      Algumas imagens deste modelo não estão disponíveis no
                      momento.
                    </p>
                  ) : null}
                  <CatalogImageDownload
                    src={activeImageUrl}
                    name={model.name}
                    id={model.id + "-" + (activeImage?.id ?? "capa")}
                    modelSlug={model.slug}
                    className="mb-3"
                  />
                  <ArcadeCard className="flex min-h-[clamp(18rem,58svh,30rem)] items-center justify-center sm:min-h-[22.5rem] md:min-h-[35rem]">
                    <CanonicalCatalogImage
                      src={activeImageUrl}
                      fallbackSrc={activeImageFallbackUrl}
                      alt={"Referência visual de " + displayName}
                      imageClassName="max-h-[75vh] w-full object-contain p-4"
                      loading="eager"
                      fetchPriority="high"
                    />
                  </ArcadeCard>
                  {images.length > 1 ? (
                    <nav
                      aria-label="Navegação das imagens carregadas"
                      aria-describedby={galleryKeyboardHelpId}
                      onKeyDown={handleGalleryKeyboard}
                      className="mt-3 flex items-center justify-between gap-3"
                    >
                      <span id={galleryKeyboardHelpId} className="sr-only">
                        Use as setas esquerda e direita para trocar a foto, Home
                        para a primeira e End para a última foto carregada.
                      </span>
                      <button
                        type="button"
                        onClick={() => moveGalleryImage(-1)}
                        aria-label="Imagem anterior"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 border border-[hsl(0,0%,20%)] px-3 text-sm hover:bg-[hsl(0,0%,10%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        <ChevronLeft aria-hidden="true" size={18} />
                        <span className="hidden sm:inline">Anterior</span>
                      </button>
                      <span
                        className="text-center text-xs text-[hsl(0,0%,65%)]"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        Imagem {activeImageIndex + 1} de {images.length}{" "}
                        carregadas
                      </span>
                      <button
                        type="button"
                        onClick={() => moveGalleryImage(1)}
                        aria-label="Próxima imagem"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 border border-[hsl(0,0%,20%)] px-3 text-sm hover:bg-[hsl(0,0%,10%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        <span className="hidden sm:inline">Próxima</span>
                        <ChevronRight aria-hidden="true" size={18} />
                      </button>
                    </nav>
                  ) : null}

                  {mediaUnderReview ? null : model.galleryVersion > 0 &&
                    galleryQuery.isPending ? (
                    <p
                      role="status"
                      className="mt-4 text-sm text-[hsl(0,0%,56%)]"
                    >
                      Carregando galeria…
                    </p>
                  ) : galleryQuery.isError ||
                    duplicateGalleryIdentity ||
                    inconsistentGalleryCount ? (
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
                      <div
                        role="group"
                        aria-label="Miniaturas da galeria"
                        aria-describedby={
                          images.length > 1 ? galleryKeyboardHelpId : undefined
                        }
                        onKeyDown={handleGalleryKeyboard}
                        className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6"
                      >
                        {images.map((image, index) => {
                          const src = imageUrl(image);
                          return (
                            <button
                              key={image.id}
                              type="button"
                              data-gallery-thumbnail
                              data-gallery-index={index}
                              onClick={() => setActiveImageId(image.id)}
                              aria-label={
                                "Ver imagem " +
                                (index + 1) +
                                " de " +
                                displayName
                              }
                              aria-pressed={activeImage?.id === image.id}
                              className="aspect-square overflow-hidden rounded-none border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))] aria-pressed:border-[hsl(var(--gold-accent))]"
                            >
                              <CanonicalCatalogImage
                                src={src}
                                fallbackSrc={thumbnailFallbackUrl(image)}
                                alt=""
                                imageClassName="h-full w-full object-cover"
                                fallbackLabel="Sem prévia"
                                fetchPriority="low"
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
                      {galleryCursorCycle ? (
                        <p
                          role="status"
                          className="mt-4 text-sm text-[hsl(0,0%,56%)]"
                        >
                          A sequência da galeria retornou a uma página já
                          visitada. O carregamento adicional foi interrompido.
                        </p>
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
                      <h1
                        ref={relatedModelTitleRef}
                        tabIndex={-1}
                        className="mt-3 break-words text-2xl font-black uppercase tracking-[0.08em] leading-tight sm:text-3xl md:text-4xl"
                      >
                        {displayName}
                      </h1>
                      {detailTags.length > 0 ? (
                        <div
                          role="group"
                          aria-label="Classificação do modelo"
                          className="mt-4 flex flex-wrap gap-2"
                        >
                          {detailTags.map((tag) => (
                            <CatalogFilterTag
                              key={tag.key}
                              kind={tag.kind}
                              label={tag.label}
                              provisional={tag.provisional}
                              onClick={tag.onClick}
                            />
                          ))}
                        </div>
                      ) : null}
                      {model.variantName ? (
                        <p className="mt-2 text-base text-[hsl(0,0%,56%)]">
                          {model.variantName}
                        </p>
                      ) : null}
                    </header>

                    <p className="whitespace-pre-line leading-relaxed text-[hsl(0,0%,70%)]">
                      {model.description ||
                        "Explore as imagens e as informações desta referência digital do acervo TONART."}
                    </p>

                    <dl className="grid grid-cols-1 gap-4 border-y border-[hsl(0,0%,15%)] py-5 text-sm min-[420px]:grid-cols-2">
                      <div>
                        <dt className="text-[hsl(0,0%,56%)]">Código</dt>
                        <dd className="mt-1 min-w-0 break-all font-medium">
                          {model.code}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[hsl(0,0%,56%)]">Material</dt>
                        <dd className="mt-1 break-words font-medium">
                          {model.material || "A confirmar no orçamento"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[hsl(0,0%,56%)]">
                          Altura de referência
                        </dt>
                        <dd className="mt-1 font-medium">
                          {model.heightCm !== null
                            ? model.heightCm.toLocaleString("pt-BR") + " cm"
                            : "A confirmar no orçamento"}
                        </dd>
                      </div>
                      {model.collection ? (
                        <div className="min-[420px]:col-span-2">
                          <dt className="text-[hsl(0,0%,56%)]">Coleção</dt>
                          <dd className="mt-1 break-words font-medium">
                            {model.collection}
                          </dd>
                        </div>
                      ) : null}
                      <div>
                        <dt className="text-[hsl(0,0%,56%)]">
                          Imagens publicadas
                        </dt>
                        <dd className="mt-1 font-medium">
                          {mediaUnderReview
                            ? coverReleased
                              ? "1 imagem disponível"
                              : "Indisponível"
                            : galleryQuery.isError ||
                                duplicateGalleryIdentity ||
                                inconsistentGalleryCount
                              ? "Indisponível"
                              : (galleryQuery.data?.pages[0]?.total ??
                                (model.galleryVersion > 0
                                  ? "Verificando…"
                                  : "Indisponível"))}
                        </dd>
                      </div>
                    </dl>

                    <p className="text-sm leading-relaxed text-[hsl(0,0%,56%)]">
                      {publicMediaHold
                        ? "Imagem digital de referência. Este catálogo é somente para consulta e não recebe pedidos ou pagamentos."
                        : "Quando houver uma condição comercial cadastrada abaixo, ela identifica a variante e o valor da peça. A equipe confirma disponibilidade, frete e prazo antes de qualquer contratação."}
                    </p>
                    <div className="border-l-2 border-[hsl(var(--gold-accent))] bg-[hsl(0,0%,9%)] p-4">
                      <h2 className="text-sm font-semibold uppercase tracking-wide">
                        Peça sob consulta
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-[hsl(0,0%,70%)]">
                        Valor, tamanho final, acabamento, prazo de produção e
                        entrega precisam ser confirmados pela equipe. As imagens
                        são renders digitais de referência, não fotos de peças
                        finalizadas.
                      </p>
                    </div>
                    {quoteRequestsEnabled && CommercialOfferDetails ? (
                      <Suspense fallback={null}>
                        <CommercialOfferDetails
                          modelSlug={model.slug}
                          enabled
                        />
                      </Suspense>
                    ) : null}
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
                      {quoteRequestsEnabled &&
                        (selectionAtCapacity ? (
                          <button
                            type="button"
                            disabled
                            aria-describedby="catalog-selection-capacity"
                            className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center bg-[hsl(var(--gold-accent))] px-4 py-3 text-sm font-semibold text-black opacity-50"
                          >
                            Solicitar orçamento deste modelo
                          </button>
                        ) : (
                          <Link
                            to={quoteRequestPath}
                            onClick={() =>
                              setSelectedModels((current) =>
                                current.some((entry) => entry.id === model.id)
                                  ? current
                                  : toggleCanonicalSelection(current, model),
                              )
                            }
                            className="inline-flex min-h-11 w-full items-center justify-center bg-[hsl(var(--gold-accent))] px-4 py-3 text-sm font-semibold text-black hover:brightness-110"
                          >
                            Solicitar orçamento deste modelo
                          </Link>
                        ))}
                      {selectionAtCapacity ? (
                        <p
                          id="catalog-selection-capacity"
                          role="status"
                          className="text-xs leading-relaxed text-[hsl(0,0%,66%)]"
                        >
                          Sua seleção já tem {MAX_CANONICAL_SELECTION} modelos.
                          Remova um modelo antes de incluir esta referência no
                          orçamento.
                        </p>
                      ) : null}
                      <p
                        role="status"
                        aria-live="polite"
                        className="text-xs text-[hsl(0,0%,56%)]"
                      >
                        Minha seleção: {selectedModels.length} de{" "}
                        {MAX_CANONICAL_SELECTION} modelos. Nenhum pedido é
                        enviado automaticamente.
                      </p>
                      <Link
                        to={catalogReturnTo}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[hsl(0,0%,20%)] px-4 py-3 text-sm text-[hsl(0,0%,80%)] hover:bg-[hsl(0,0%,9%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        <ArrowLeft size={16} aria-hidden="true" />
                        Continuar explorando
                      </Link>
                    </div>
                    {quoteRequestsEnabled ? (
                      <details className="border-t border-[hsl(0,0%,15%)] pt-4">
                        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                          Como funcionam as Coins
                        </summary>
                        <div className="space-y-3 pb-4 text-sm leading-relaxed text-[hsl(0,0%,70%)]">
                          <p>
                            O plano de coleção compra as peças contratadas; seu
                            valor principal não vira Coins. Bônus de plano são
                            creditados por envio real após pagamento PIX
                            integral, conforme o benefício configurado.
                          </p>
                          <p>
                            Coins podem ser usadas em ofertas extras elegíveis
                            de toda a TONART, em pagamento integral ou misto
                            quando a oferta e o checkout aceitarem Coins.
                            Orçamentos, entrada de pré-venda, parcelas de plano
                            e frete ficam fora do uso de Coins. Esta ficha não
                            debita saldo.
                          </p>
                          <Link
                            to="/moedas"
                            className="inline-flex min-h-11 items-center text-sm font-semibold text-[hsl(var(--gold-accent))] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                          >
                            Consultar saldo e movimentações de Coins
                          </Link>
                        </div>
                      </details>
                    ) : null}
                    <details className="border-t border-[hsl(0,0%,15%)] pt-4">
                      <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                        Como preparar sua solicitação
                      </summary>
                      <p className="pb-3 text-sm leading-relaxed text-[hsl(0,0%,70%)]">
                        Anote o tamanho desejado, suas preferências de
                        acabamento e o CEP de entrega. Essas informações ajudam
                        a equipe a avaliar as possibilidades para esta
                        referência.
                        {quoteRequestsEnabled
                          ? " Ao solicitar o orçamento, você poderá complementar sua seleção no formulário."
                          : " Neste catálogo de consulta, a seleção não é enviada à equipe."}
                      </p>
                    </details>
                  </div>
                </ArcadeCard>
              </article>
              {!mediaUnderReview ? (
                <RelatedModels
                  model={model}
                  gateway={gateway}
                  returnPath={catalogReturnTo}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </Page>
  );
}
