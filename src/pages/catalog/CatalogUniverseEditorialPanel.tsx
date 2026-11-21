import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { isPublicEditorialProjectionEnabled } from "@/config/catalog-editorial-projection";
import { CANONICAL_CATALOG_API_BASE } from "@/config/canonical-catalog-endpoint";
import {
  createPublicCatalogGateway,
  validCatalogSlug,
} from "@/services/catalog/public-catalog-gateway";
import { ApprovedUniverseProfile } from "@/pages/catalog/ApprovedEditorialProfiles";

export function CatalogUniverseEditorialPanel({
  categorySlug,
  franchiseSlug,
}: {
  categorySlug: string;
  franchiseSlug: string;
}) {
  const enabled =
    isPublicEditorialProjectionEnabled() &&
    validCatalogSlug(categorySlug) &&
    validCatalogSlug(franchiseSlug);
  const gateway = useMemo(() => {
    if (!CANONICAL_CATALOG_API_BASE) return null;
    try {
      return createPublicCatalogGateway(CANONICAL_CATALOG_API_BASE, fetch);
    } catch {
      return null;
    }
  }, []);
  const query = useQuery({
    queryKey: ["tonecos-editorial-universe", categorySlug, franchiseSlug],
    queryFn: ({ signal }) =>
      gateway!.getUniverseProfile(categorySlug, franchiseSlug, signal),
    enabled: enabled && gateway !== null,
    retry: false,
    staleTime: 15 * 60 * 1000,
  });

  if (!isPublicEditorialProjectionEnabled()) return null;
  if (!gateway) {
    return (
      <p role="status" className="mb-6 text-sm text-[hsl(0,0%,60%)]">
        Ficha editorial indisponível: o gateway do catálogo não está
        configurado.
      </p>
    );
  }
  if (!validCatalogSlug(categorySlug) || !validCatalogSlug(franchiseSlug))
    return null;
  if (query.isPending) {
    return (
      <p role="status" className="mb-6 text-sm text-[hsl(0,0%,60%)]">
        Carregando ficha revisada do universo…
      </p>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div
        role="status"
        className="mb-6 flex flex-wrap items-center gap-3 text-sm text-[hsl(0,0%,60%)]"
      >
        <p>A ficha editorial deste universo ainda não está publicada.</p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="inline-flex min-h-11 items-center border border-[hsl(var(--gold-accent)/0.4)] px-3 text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return <ApprovedUniverseProfile profile={query.data} gateway={gateway} />;
}
