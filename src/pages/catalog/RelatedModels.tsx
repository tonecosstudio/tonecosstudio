import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CanonicalCatalogImage } from "@/components/catalog/CanonicalCatalogImage";
import { PUBLIC_ROUTES, catalogUniverseFranchisePath } from "@/config/routes";
import {
  type PublicCatalogDetail,
  type PublicCatalogModel,
  type PublicCatalogPage,
  createPublicCatalogGateway,
  validCatalogSlug,
  validCatalogFolder,
} from "@/services/catalog/public-catalog-gateway";

type CatalogGateway = ReturnType<typeof createPublicCatalogGateway>;
type RelatedGroup = { kind: "character" | "collection" | "franchise"; title: string; items: PublicCatalogModel[] };
const RELATED_PAGE_LIMIT = 36;
const GROUP_LIMIT = 4;

/** Forward only the already-validated, first-party return URL. Never carry
 * arbitrary route state or stale sibling-model snapshots to a recommendation.
 */
export function relatedCatalogReturnState(returnPath: string): {
  catalogReturnSearch?: string;
  catalogReturnUniverse?: { category: string; franchise: string; folder?: string };
} {
  const universePrefix = PUBLIC_ROUTES.catalog + "/";
  if (returnPath.startsWith(universePrefix)) {
    const [path, search = ""] = returnPath.split("?");
    const segments = path.slice(universePrefix.length).split("/");
    const folder = new URLSearchParams(search).get("folder");
    if (segments.length === 2 && segments.every(validCatalogSlug) &&
        (folder === null || validCatalogFolder(folder))) {
      return {
        catalogReturnUniverse: {
          category: segments[0],
          franchise: segments[1],
          ...(folder ? { folder } : {}),
        },
      };
    }
  }
  if (returnPath === PUBLIC_ROUTES.catalogModels) {
    return { catalogReturnSearch: "" };
  }
  if (returnPath.startsWith(PUBLIC_ROUTES.catalogModels + "?")) {
    // The parent detail already validated the complete filter query.
    return { catalogReturnSearch: returnPath.slice(PUBLIC_ROUTES.catalogModels.length + 1) };
  }
  return { catalogReturnSearch: "" };
}

function exactKey(value: string | null | undefined): string {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
}

/**
 * Public discovery chips use ONLY validated catalog category/franchise values.
 * A model name is a search hint, not proof of a verified character identity.
 * Once the Worker publishes reviewed character IDs, a dedicated character
 * link can replace the name-search chip without changing the catalogue SSOT.
 */
export type CatalogDiscoveryTag = {
  kind: "category" | "universe" | "name-search";
  label: string;
  accessibleLabel: string;
  to: string;
};

export function catalogDiscoveryTags(
  model: Pick<
    PublicCatalogDetail,
    "category" | "categorySlug" | "franchise" | "franchiseSlug" | "name"
  >,
): CatalogDiscoveryTag[] {
  if (
    !validCatalogSlug(model.categorySlug) ||
    !validCatalogSlug(model.franchiseSlug)
  ) return [];

  const category = model.category.trim();
  const franchise = model.franchise.trim();
  if (!category || !franchise) return [];

  const categorySearch = new URLSearchParams({ category: model.categorySlug });
  const tags: CatalogDiscoveryTag[] = [
    {
      kind: "category",
      label: category,
      accessibleLabel: "Ver categoria " + category,
      to: PUBLIC_ROUTES.catalogModels + "?" + categorySearch.toString(),
    },
    {
      kind: "universe",
      label: franchise,
      accessibleLabel: "Explorar universo " + franchise,
      to: catalogUniverseFranchisePath(model.categorySlug, model.franchiseSlug),
    },
  ];

  const name = model.name.trim();
  const length = Array.from(name).length;
  // The Worker search contract allows 3–80 Unicode characters. Avoid
  // control characters and never present title-based search as identity.
  if (length >= 3 && length <= 80 && !/[\\u0000-\\u001f\\u007f<>]/.test(name)) {
    const params = new URLSearchParams({
      q: name,
      category: model.categorySlug,
      franchise: model.franchiseSlug,
    });
    tags.push({
      kind: "name-search",
      label: name,
      accessibleLabel: "Buscar modelos pelo nome " + name,
      to: PUBLIC_ROUTES.catalogModels + "?" + params.toString(),
    });
  }
  return tags;
}

/**
 * Only catalog-authoritative fields may establish a relationship.
 * An identical name within the same franchise is a conservative character
 * match; collection is NOT presented as a verified work/series identity.
 * Never classify by partial title, keywords or image similarity.
 */
export function selectRelatedModelGroups(
  current: PublicCatalogDetail,
  candidates: PublicCatalogModel[],
): RelatedGroup[] {
  const currentCharacter = exactKey(current.name);
  const currentCollection = exactKey(current.collection);
  const seenModels = new Set([current.id]);
  const seenSlugs = new Set([current.slug]);
  const seenCodes = new Set([current.code]);
  const byCharacter: PublicCatalogModel[] = [];
  const byCollection: PublicCatalogModel[] = [];
  const byFranchise: PublicCatalogModel[] = [];

  for (const candidate of candidates.slice(0, RELATED_PAGE_LIMIT * 2)) {
    if (
      !candidate.coverStorageKey ||
      candidate.imageCount < 1 ||
      candidate.id === current.id ||
      candidate.slug === current.slug ||
      candidate.categorySlug !== current.categorySlug ||
      candidate.franchiseSlug !== current.franchiseSlug ||
      !validCatalogSlug(candidate.slug) ||
      seenModels.has(candidate.id) ||
      seenSlugs.has(candidate.slug) ||
      seenCodes.has(candidate.code)
    ) continue;

    const character = exactKey(candidate.name);
    // Only stable published identities are safe for deduplication. Distinct
    // sculptures may share the same character name and variant label.
    seenModels.add(candidate.id);
    seenSlugs.add(candidate.slug);
    seenCodes.add(candidate.code);

    if (currentCharacter && character === currentCharacter) {
      byCharacter.push(candidate);
    } else if (
      currentCollection &&
      exactKey(candidate.collection) === currentCollection
    ) {
      byCollection.push(candidate);
    } else {
      byFranchise.push(candidate);
    }
  }

  const groups: RelatedGroup[] = [];
  if (byCharacter.length) groups.push({
    kind: "character",
    title: "Outras versões de " + current.name,
    items: byCharacter.slice(0, GROUP_LIMIT),
  });
  if (byCollection.length) groups.push({
    kind: "collection",
    title: "Da mesma coleção",
    items: byCollection.slice(0, GROUP_LIMIT),
  });
  if (byFranchise.length) groups.push({
    kind: "franchise",
    title: "Explore " + current.franchise,
    items: byFranchise.slice(0, GROUP_LIMIT),
  });
  return groups;
}

/**
 * A single bounded, indexed catalog read is deferred until the section is
 * near the viewport. No cursor walking, direct D1 access, or model lookups.
 * React Query shares this franchise/category page for subsequent details.
 */
export function RelatedModels({
  model,
  gateway,
  returnPath,
}: {
  model: PublicCatalogDetail;
  gateway: CatalogGateway;
  returnPath: string;
}) {
  const queryClient = useQueryClient();
  const sectionRef = useRef<HTMLElement>(null);
  const [requestedSlug, setRequestedSlug] = useState<string | null>(null);
  const isRequested = requestedSlug === model.slug;
  const canQuery = validCatalogSlug(model.categorySlug) &&
    validCatalogSlug(model.franchiseSlug);

  useEffect(() => {
    if (isRequested || !canQuery || typeof IntersectionObserver === "undefined") return;
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setRequestedSlug(model.slug);
        observer.disconnect();
      }
    }, { rootMargin: "240px" });
    observer.observe(section);
    return () => observer.disconnect();
  }, [model.slug, isRequested, canQuery]);

  // Reuse the first gateway-validated catalog page when the visitor came
  // from this exact category/franchise. No additional catalog read is needed.
  const catalogScope = JSON.stringify(["", model.categorySlug, model.franchiseSlug, ""]);
  const cachedCatalogKey = ["tonecos-catalog-list", catalogScope, undefined] as const;
  const relatedQuery = useQuery({
    queryKey: ["tonecos-catalog-related", model.categorySlug, model.franchiseSlug],
    queryFn: ({ signal }) => gateway.listPage({
      category: model.categorySlug,
      franchise: model.franchiseSlug,
      limit: RELATED_PAGE_LIMIT,
    }, signal),
    enabled: isRequested && canQuery,
    initialData: () => queryClient.getQueryData<PublicCatalogPage>(cachedCatalogKey),
    initialDataUpdatedAt: () => queryClient.getQueryState(cachedCatalogKey)?.dataUpdatedAt,
    retry: false,
    staleTime: 15 * 60 * 1000,
  });

  const initialGroups = useMemo(
    () => selectRelatedModelGroups(model, (relatedQuery.data?.items ?? []).filter(
      (item) => gateway.mediaUrl(item.coverStorageKey) !== null,
    )),
    [model, gateway, relatedQuery.data],
  );

  // A sorted franchise page may not contain the character at all. Only in
  // that case, one additional indexed name search can recover exact matches.
  // Never walk cursors or fetch every model in a large franchise.
  const characterSearchLength = Array.from(model.name.trim()).length;
  const shouldSearchCharacter =
    isRequested && canQuery && relatedQuery.isSuccess &&
    !initialGroups.some((group) => group.kind === "character") &&
    characterSearchLength >= 3 && characterSearchLength <= 80;
  const characterQuery = useQuery({
    queryKey: [
      "tonecos-catalog-related-character",
      model.categorySlug,
      model.franchiseSlug,
      model.name.trim(),
    ],
    queryFn: ({ signal }) => gateway.listPage({
      category: model.categorySlug,
      franchise: model.franchiseSlug,
      search: model.name.trim(),
      limit: RELATED_PAGE_LIMIT,
    }, signal),
    enabled: shouldSearchCharacter,
    retry: false,
    staleTime: 15 * 60 * 1000,
  });

  const groups = useMemo(() => {
    // Search results may contain partial-title matches; never mislabel them
    // as related characters or add them to an unrelated franchise group.
    const exactCharacterMatches = (characterQuery.data?.items ?? []).filter(
      (item) => exactKey(item.name) === exactKey(model.name),
    );
    return selectRelatedModelGroups(
      model,
      [...exactCharacterMatches, ...(relatedQuery.data?.items ?? [])].filter(
        (item) => gateway.mediaUrl(item.coverStorageKey) !== null,
      ),
    );
  }, [model, gateway, relatedQuery.data, characterQuery.data]);
  const waitingForCharacter = shouldSearchCharacter && characterQuery.isPending;
  // A transient failure must not silently erase the recommendations.
  // Existing verified groups remain usable if a background refetch fails.
  const recoverableError = isRequested && groups.length === 0 && (
    relatedQuery.isError || (shouldSearchCharacter && characterQuery.isError)
  );

  if (!canQuery) return null;
  // Do not display an empty section while waiting for the viewport trigger.
  // Keep an invisible intersection target; older browsers retain a manual button.
  const observerAvailable = typeof IntersectionObserver !== "undefined";
  if (!isRequested && observerAvailable) {
    return <section ref={sectionRef} aria-hidden="true" className="h-px" />;
  }
  // With automatic discovery, reveal the section only after eligible models
  // exist. Older browsers retain the explicit button and its loading status.
  if (isRequested && observerAvailable && (relatedQuery.isPending || waitingForCharacter)) return null;
  if (isRequested && !recoverableError && relatedQuery.isSuccess &&
      !waitingForCharacter && groups.length === 0) return null;

  const discoveryTags = catalogDiscoveryTags(model);

  const franchisePath = PUBLIC_ROUTES.catalogModels + "?" +
    new URLSearchParams({
      category: model.categorySlug,
      franchise: model.franchiseSlug,
    }).toString();

  return (
    <section ref={sectionRef} aria-label="Explore mais modelos" className="mt-12 border-t border-[hsl(0,0%,20%)] pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold uppercase tracking-[0.08em] text-[hsl(0,0%,94%)]">
          Explore mais modelos
        </h2>
        {relatedQuery.isSuccess && groups.length > 0 ? (
          <Link
            to={franchisePath}
            className="inline-flex min-h-11 items-center text-sm text-[hsl(var(--gold-accent))] underline-offset-4 hover:underline focus-visible:outline-2"
          >
            Ver todos de {model.franchise}
          </Link>
        ) : null}
      </div>
      <nav aria-label="Explorar filtros do catálogo" className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs uppercase tracking-wider text-[hsl(0,0%,56%)]">
          Explorar por
        </span>
        {discoveryTags.map((tag) => (
          <Link
            key={tag.kind}
            to={tag.to}
            aria-label={tag.accessibleLabel}
            className="inline-flex min-h-11 items-center rounded-full border border-[hsl(0,0%,28%)] px-3 py-2 text-sm text-[hsl(0,0%,88%)] transition-colors hover:border-[hsl(var(--gold-accent)/0.7)] hover:text-[hsl(var(--gold-accent))] focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {tag.label}
          </Link>
        ))}
      </nav>
      {!isRequested ? (
        <button
          type="button"
          onClick={() => setRequestedSlug(model.slug)}
          className="mt-4 min-h-11 border border-[hsl(var(--gold-accent)/0.5)] px-4 text-sm text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline-2"
        >
          Ver sugestões relacionadas
        </button>
      ) : recoverableError ? (
        <div role="status" className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[hsl(0,0%,70%)]">
          <p>Não foi possível carregar sugestões agora.</p>
          <button
            type="button"
            onClick={() => {
              if (relatedQuery.isError) void relatedQuery.refetch();
              else void characterQuery.refetch();
            }}
            className="min-h-11 border border-[hsl(var(--gold-accent)/0.5)] px-4 text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline-2"
          >
            Tentar novamente
          </button>
        </div>
      ) : relatedQuery.isPending || waitingForCharacter ? (
        <p role="status" className="mt-4 text-sm text-[hsl(0,0%,56%)]">
          Procurando modelos relacionados…
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 text-base font-medium text-[hsl(var(--gold-accent))]">
                {group.title}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {group.items.map((item) => (
                  <Link
                    key={item.id}
                    to={PUBLIC_ROUTES.catalogModels + "/" + item.slug}
                    state={{
                      ...relatedCatalogReturnState(returnPath),
                      catalogRelatedFrom: model.slug,
                    }}
                    className="group min-w-0 border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,7%)] transition-colors hover:border-[hsl(var(--gold-accent)/0.6)] focus-visible:outline-2 focus-visible:outline-offset-2"
                    aria-label={"Ver modelo " + item.name +
                      (item.variantName ? " — " + item.variantName : "")}
                  >
                    <div className="aspect-[3/4] overflow-hidden bg-[hsl(0,0%,9%)]">
                      <CanonicalCatalogImage
                        src={gateway.mediaUrl(item.coverStorageKey)}
                        alt={"Referência visual de " + item.name}
                        imageClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                        loading="lazy"
                        fetchPriority="low"
                      />
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-sm font-semibold">{item.name}</p>
                      {item.variantName ? (
                        <p className="mt-1 line-clamp-1 text-xs text-[hsl(0,0%,56%)]">
                          {item.variantName}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
