import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Shield } from "lucide-react";
import { Page } from "@/components/layouts/Page";
import { ArcadeHero } from "@/components/arcade/ArcadeLayout";
import { CanonicalCatalogImage } from "@/components/catalog/CanonicalCatalogImage";
import { PUBLIC_ROUTES, catalogModelDetailsPath } from "@/config/routes";
import {
  approvedPublicRenders,
  isApprovedPublicCover,
  type ApprovedPublicRender,
} from "@/services/catalog/approved-public-renders";
import {
  type PublicCatalogDetail,
  createPublicCatalogGateway,
} from "@/services/catalog/public-catalog-gateway";

type Gateway = Pick<ReturnType<typeof createPublicCatalogGateway>, "getModel" | "mediaUrl">;
const PAGE_SIZE = 12;

/**
 * Visual-MVP-only selection, sourced from one approval manifest.
 * Uses at most 12 indexed model-detail GETs for the current approved page,
 * never searches the whole Worker catalog or touches D1 when empty.
 * Every returned model must match the reviewed ID + slug + cover key exactly.
 */
export function ApprovedModelShowcase({
  gateway,
  releases = approvedPublicRenders,
}: {
  gateway: Gateway | null;
  releases?: readonly ApprovedPublicRender[];
}) {
  const [page, setPage] = useState(0);
  const start = page * PAGE_SIZE;
  const current = releases.slice(start, start + PAGE_SIZE);
  const models = useQuery({
    queryKey: ["tonart-approved-renders", current.map((entry) =>
      [entry.modelId, entry.slug, entry.coverStorageKey].join(":"),
    )],
    queryFn: async ({ signal }) => {
      const responses = await Promise.allSettled(
        current.map((entry) => gateway!.getModel(entry.slug, signal)),
      );
      return responses.flatMap((result, index): PublicCatalogDetail[] => {
        const entry = current[index];
        if (!entry || result.status !== "fulfilled" ||
          !isApprovedPublicCover(result.value, [entry]) ||
          !gateway!.mediaUrl(entry.coverStorageKey)) return [];
        return [result.value];
      });
    },
    enabled: current.length > 0 && gateway !== null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (releases.length === 0) {
    return (
      <Page
        title="Acervo em preparação — TONART Studio"
        description="A vitrine de renders da TONART Studio está em curadoria. Só publicaremos modelos com imagens de origem e uso autorizados."
      >
        <section className="min-h-[75svh] bg-[hsl(0,0%,4%)] pb-20 text-[hsl(0,0%,94%)]">
          <ArcadeHero badge="ACERVO TONART" title="MODELOS" subtitle=">> UMA VITRINE VISUAL EM PREPARAÇÃO." compact />
          <div role="status" className="relative z-10 mx-auto max-w-3xl border-l-2 border-[hsl(var(--gold-accent))] bg-[hsl(0,0%,7%)] px-6 py-9 sm:px-10 sm:py-12">
            <p className="font-mono text-xs uppercase tracking-[0.17em] text-[hsl(var(--gold-accent))]">MVP VISUAL EM CURADORIA</p>
            <h2 className="mt-5 text-2xl font-semibold uppercase tracking-wide sm:text-3xl">Imagens em preparação</h2>
            <p className="mt-5 text-sm leading-7 text-[hsl(0,0%,76%)]">
              A TONART apresenta modelos por meio de renders digitais; eles não representam peças físicas já produzidas. Estamos revisando a origem e as permissões de cada imagem antes de liberar a vitrine.
            </p>
            <p className="mt-3 text-sm leading-7 text-[hsl(0,0%,64%)]">
              Referências com mídia ainda não autorizada permanecem preservadas no acervo interno. Não exibimos cards sem imagem nem renders de procedência não verificada como modelos prontos para publicação.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to={PUBLIC_ROUTES.about} className="inline-flex min-h-11 items-center border border-[hsl(var(--gold-accent))] px-5 text-sm font-semibold text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)]">Conheça o estúdio</Link>
              <Link to={PUBLIC_ROUTES.contact} className="inline-flex min-h-11 items-center border border-[hsl(0,0%,40%)] px-5 text-sm text-[hsl(0,0%,88%)] hover:border-[hsl(var(--gold-accent))]">Entre em contato</Link>
            </div>
          </div>
        </section>
      </Page>
    );
  }

  const approvedCards = (models.data ?? []).flatMap((model) => {
    const entry = current.find((value) => isApprovedPublicCover(model, [value]));
    const url = gateway?.mediaUrl(model.coverStorageKey);
    return entry && url ? [{ model, entry, url }] : [];
  });

  return (
    <Page title="Modelos — TONART Studio" description="Renders digitais de modelos 3D com origem e exibição autorizadas para o catálogo TONART.">
      <section className="min-h-[75svh] bg-[hsl(0,0%,4%)] px-4 pb-20 text-[hsl(0,0%,94%)] sm:px-8">
        <ArcadeHero badge="SELEÇÃO TONART" title="MODELOS" subtitle=">> RENDERS DIGITAIS COM PUBLICAÇÃO AUTORIZADA." compact />
        <div className="mx-auto max-w-6xl">
          <p className="mb-8 max-w-3xl text-sm leading-7 text-[hsl(0,0%,70%)]">
            Referências de esculturas digitais. Cada render publicado possui registro de autorização; imagens de origem não verificada não aparecem nesta seleção.
          </p>
          {gateway === null ? (
            <p role="alert" className="text-sm">O catálogo está temporariamente indisponível.</p>
          ) : models.isPending ? (
            <p role="status" className="text-sm">Carregando referências autorizadas…</p>
          ) : models.isError ? (
            <p role="alert" className="text-sm">Não foi possível verificar as referências autorizadas.</p>
          ) : approvedCards.length === 0 ? (
            <p role="status" className="text-sm">As referências desta seleção ainda não puderam ser verificadas. Nenhuma imagem sem autorização será exibida.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {approvedCards.map(({ model, entry, url }) => (
                <article key={model.id} className="overflow-hidden border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(0,0%,7%)]">
                  <Link to={catalogModelDetailsPath(model.slug)} className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--gold-accent))]">
                    <div className="aspect-[2/3] overflow-hidden bg-[hsl(0,0%,10%)]">
                      <CanonicalCatalogImage
                        src={url}
                        alt={"Render digital de " + model.name}
                        imageClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="space-y-2 p-4">
                      <h2 className="text-sm font-semibold">{model.name}</h2>
                      <p className="text-xs text-[hsl(0,0%,70%)]">{model.variantName}</p>
                      <p className="text-xs text-[hsl(0,0%,70%)]">Render: {entry.creatorCredit}</p>
                      <span className="inline-flex items-center gap-2 pt-2 text-xs font-semibold text-[hsl(var(--gold-accent))]">Ver detalhes <ArrowRight size={14} aria-hidden="true" /></span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
          {releases.length > PAGE_SIZE ? (
            <nav aria-label="Páginas dos renders aprovados" className="mt-8 flex justify-between gap-4">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="inline-flex min-h-11 items-center gap-2 border px-4 text-sm disabled:opacity-40"><ArrowLeft size={16} aria-hidden="true" /> Anterior</button>
              <span className="self-center text-sm">{page + 1} de {Math.ceil(releases.length / PAGE_SIZE)}</span>
              <button type="button" disabled={start + PAGE_SIZE >= releases.length} onClick={() => setPage((p) => p + 1)} className="inline-flex min-h-11 items-center gap-2 border px-4 text-sm disabled:opacity-40">Próxima <ArrowRight size={16} aria-hidden="true" /></button>
            </nav>
          ) : null}
          <p className="mt-10 flex items-center gap-2 text-xs text-[hsl(0,0%,63%)]"><Shield size={15} aria-hidden="true" /> Catálogo somente para consulta. Não há pedidos ou pagamentos nesta página.</p>
        </div>
      </section>
    </Page>
  );
}
