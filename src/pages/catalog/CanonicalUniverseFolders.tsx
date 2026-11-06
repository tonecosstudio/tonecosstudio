import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, Folder } from "lucide-react";
import { CanonicalCatalogImage } from "@/components/catalog/CanonicalCatalogImage";
import { ArcadeCard } from "@/components/arcade/ArcadeLayout";
import { PUBLIC_ROUTES, catalogModelDetailsPath } from "@/config/routes";
import { createPublicCatalogGateway, validCatalogSlug } from "@/services/catalog/public-catalog-gateway";
import { useCatalogBrowsing } from "@/services/catalog/catalog-browsing-context";
import { formatModelCountLabel } from "@/lib/catalog-model-count";

type Gateway = ReturnType<typeof createPublicCatalogGateway>;

export function CanonicalUniverseFolders({
  category,
  franchise,
  gateway,
}: {
  category: string;
  franchise: string;
  gateway: Gateway;
}) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const parent = searchParams.get("folder")?.trim() ?? "";
  const currentFolderPath = location.pathname + location.search;
  const { universeReturnFocus, setUniverseReturnFocus } = useCatalogBrowsing();
  const returnModelRef = useRef<HTMLAnchorElement>(null);

  function folderPath(path = "") {
    return location.pathname + (path ? "?folder=" + encodeURIComponent(path) : "");
  }

  function modelsPath(path = parent) {
    const params = new URLSearchParams({ category, franchise });
    if (path) params.set("folder", path);
    return PUBLIC_ROUTES.catalogModels + "?" + params.toString();
  }

  const foldersQuery = useQuery({
    queryKey: ["tonecos-universe-folders", category, franchise, parent],
    queryFn: ({ signal }) =>
      gateway.listFolders({ category, franchise, parent }, signal),
    retry: false,
    staleTime: 15 * 60 * 1000,
  });

  // One bounded catalog page supplies both folder cover candidates and the
  // eight existing preview cards. Never issue one request per folder.
  const modelsQuery = useQuery({
    queryKey: ["tonecos-universe-folder-models", category, franchise, parent],
    queryFn: ({ signal }) =>
      gateway.listPage(
        { category, franchise, folder: parent || undefined, limit: 60 },
        signal,
      ),
    enabled: foldersQuery.isSuccess,
    retry: false,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const focus = universeReturnFocus;
    if (!focus || focus.path !== currentFolderPath ||
        !foldersQuery.isSuccess || !modelsQuery.isSuccess) return;
    const modelLink = returnModelRef.current;
    if (modelLink) {
      modelLink.scrollIntoView?.({ behavior: "auto", block: "center" });
      modelLink.focus({ preventScroll: true });
    }
    // Consume stale targets too: an unpublished card must not focus later.
    setUniverseReturnFocus((current) =>
      current?.path === currentFolderPath && current.slug === focus.slug
        ? null : current,
    );
  }, [
    universeReturnFocus, currentFolderPath, foldersQuery.isSuccess,
    modelsQuery.isSuccess, setUniverseReturnFocus,
  ]);

  if (foldersQuery.isPending) {
    return <p role="status" className="mt-6 p-8 text-sm">Carregando pastas publicadas…</p>;
  }
  if (foldersQuery.isError) {
    return (
      <div role="alert" className="mt-6 border border-[hsl(0,0%,18%)] p-8 text-sm">
        Pasta indisponível ou inválida. Nenhum resultado de outra fonte foi utilizado.
        <button type="button" onClick={() => void foldersQuery.refetch()} className="ml-3 border border-[hsl(var(--gold-accent)/0.5)] px-3 py-2 text-[hsl(var(--gold-accent))]">
          Tentar novamente
        </button>
      </div>
    );
  }

  const folders = foldersQuery.data.items;
  const coverCandidates = modelsQuery.data?.items ?? [];
  const models = coverCandidates.slice(0, 8);
  // Only the eight already published and fetched preview models may become
  // adjacent links. No pagination, new Worker queries or unverified slugs.
  const previewSlugs = models.length >= 2 && models.length <= 8 &&
    models.every((item) => validCatalogSlug(item.slug)) &&
    new Set(models.map((item) => item.slug)).size === models.length
    ? models.map((item) => item.slug)
    : [];

  return (
    <div className="mt-6">
      <nav aria-label="Caminho das pastas" className="mb-5 flex flex-wrap items-center gap-2 font-mono text-xs text-[hsl(var(--gold-accent))]">
        <Link to={folderPath()} className="inline-flex min-h-11 items-center py-2 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]">Raiz da franquia</Link>
        {foldersQuery.data.trail.map((part) => (
          <span key={part.id} className="flex items-center gap-2">
            <span aria-hidden="true" className="text-[hsl(0,0%,45%)]">/</span>
            <Link to={folderPath(part.id)} className="inline-flex min-h-11 items-center py-2 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]">{part.label}</Link>
          </span>
        ))}
      </nav>
      {folders.length > 0 && (
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {folders.map((folder) => {
            const representative = coverCandidates.find((model) =>
              model.coverStorageKey && model.folderPath &&
              (model.folderPath === folder.id || model.folderPath.startsWith(folder.id + "/")),
            );
            const cover = representative ? gateway.mediaUrl(representative.coverStorageKey) : null;
            return (
              <ArcadeCard key={folder.id}>
                <Link to={folderPath(folder.id)} className="group relative flex min-h-44 flex-col justify-end overflow-hidden p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]" aria-label={`${folder.label} ${formatModelCountLabel(folder.count)}`}>
                  {cover ? (
                    <>
                      <div className="absolute inset-0 bg-[hsl(0,0%,8%)]" aria-hidden="true">
                        <CanonicalCatalogImage src={cover} alt="" imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/15" aria-hidden="true" />
                    </>
                  ) : (
                    <Folder className="mb-5 h-8 w-8 text-[hsl(var(--gold-accent))]" aria-hidden="true" />
                  )}
                  <span className="relative z-10 line-clamp-2 font-semibold uppercase text-white drop-shadow-md">{folder.label}</span>
                  <span className="relative z-10 mt-3 flex items-center justify-between text-xs text-white/75">
                    {formatModelCountLabel(folder.count)} <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </Link>
              </ArcadeCard>
            );
          })}
        </div>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-semibold uppercase tracking-widest text-[hsl(var(--gold-accent))]">
          Referências desta {parent ? "pasta" : "franquia"}
        </h3>
        <Link to={modelsPath()} className="inline-flex min-h-11 items-center justify-center border border-[hsl(var(--gold-accent)/0.5)] px-4 py-3 font-mono text-xs uppercase text-[hsl(var(--gold-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]">
          Explorar todos os modelos
        </Link>
      </div>
      {modelsQuery.isPending ? (
        <p role="status" className="mt-5 p-6 text-sm">Carregando miniaturas…</p>
      ) : modelsQuery.isError ? (
        <div role="alert" className="mt-5 border border-[hsl(0,0%,18%)] p-6 text-sm">
          Não foi possível consultar as miniaturas publicadas.
          <button type="button" onClick={() => void modelsQuery.refetch()} className="ml-3 border border-[hsl(var(--gold-accent)/0.5)] px-3 py-2">Tentar novamente</button>
        </div>
      ) : models.length === 0 ? (
        <p role="status" className="mt-5 p-6 text-sm">Nenhum modelo publicado neste recorte.</p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {models.map((model) => {
            const image = gateway.mediaUrl(model.coverStorageKey);
            return (
              <ArcadeCard key={model.id}>
                <Link
                  to={catalogModelDetailsPath(model.slug)}
                  ref={universeReturnFocus?.path === currentFolderPath &&
                    universeReturnFocus.slug === model.slug
                    ? returnModelRef : undefined}
                  state={{
                    catalogReturnUniverse: { category, franchise, folder: parent },
                    universeSiblingSlugs: previewSlugs,
                  }}
                  className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                  aria-label={"Ver detalhes de " + model.name}
                >
                  <div className="flex aspect-[2/3] items-center justify-center overflow-hidden bg-[hsl(0,0%,8%)]">
                    <CanonicalCatalogImage
                      src={image}
                      alt={"Referência visual de " + model.name}
                      imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                    />
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-3 sm:line-clamp-2 font-semibold uppercase">{model.name}</p>
                    <p className="mt-1 truncate text-xs text-[hsl(0,0%,56%)]">{model.variantName || model.franchise}</p>
                  </div>
                </Link>
              </ArcadeCard>
            );
          })}
        </div>
      )}
      {modelsQuery.data?.nextCursor && (
        <Link to={modelsPath()} className="mt-6 inline-flex min-h-11 items-center gap-2 py-2 text-sm text-[hsl(var(--gold-accent))] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]">
          Ver mais modelos <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
