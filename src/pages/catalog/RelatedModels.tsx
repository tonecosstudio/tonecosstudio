import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CanonicalCatalogImage } from "@/components/catalog/CanonicalCatalogImage";
import { PUBLIC_ROUTES } from "@/config/routes";
import {
  type PublicCatalogDetail,
  type PublicCatalogModel,
  createPublicCatalogGateway,
  validCatalogSlug,
} from "@/services/catalog/public-catalog-gateway";

type CatalogGateway = ReturnType<typeof createPublicCatalogGateway>;
type RelatedGroup = { title: string; items: PublicCatalogModel[] };
const RELATED_PAGE_LIMIT = 36;
const GROUP_LIMIT = 4;

function exactKey(value: string | null | undefined): string {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
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

  for (const candidate of candidates.slice(0, RELATED_PAGE_LIMIT)) {
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
    title: "Outras versões de " + current.name,
    items: byCharacter.slice(0, GROUP_LIMIT),
  });
  if (byCollection.length) groups.push({
    title: "Da mesma coleção",
    items: byCollection.slice(0, GROUP_LIMIT),
  });
  if (byFranchise.length) groups.push({
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
}: {
  model: PublicCatalogDetail;
  gateway: CatalogGateway;
}) {
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

  const relatedQuery = useQuery({
    queryKey: ["tonecos-catalog-related", model.categorySlug, model.franchiseSlug],
    queryFn: ({ signal }) => gateway.listPage({
      category: model.categorySlug,
      franchise: model.franchiseSlug,
      limit: RELATED_PAGE_LIMIT,
    }, signal),
    enabled: isRequested && canQuery,
    retry: false,
    staleTime: 15 * 60 * 1000,
  });

  const groups = useMemo(
    () => selectRelatedModelGroups(model, (relatedQuery.data?.items ?? []).filter(
      (item) => gateway.mediaUrl(item.coverStorageKey) !== null,
    )),
    [model, gateway, relatedQuery.data],
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
  if (isRequested && observerAvailable && !relatedQuery.isSuccess) return null;
  if (isRequested && (relatedQuery.isError ||
    (relatedQuery.isSuccess && groups.length === 0))) return null;

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
      {!isRequested ? (
        <button
          type="button"
          onClick={() => setRequestedSlug(model.slug)}
          className="mt-4 min-h-11 border border-[hsl(var(--gold-accent)/0.5)] px-4 text-sm text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline-2"
        >
          Ver sugestões relacionadas
        </button>
      ) : relatedQuery.isPending ? (
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
