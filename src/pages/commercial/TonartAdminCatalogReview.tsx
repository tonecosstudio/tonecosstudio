/**
 * Catalog inspection within the original TONART administrative workspace.
 *
 * SSOT: the public, read-only Cloudflare catalog gateway already used by
 * /modelos. No Supabase mirror, no write credential, no second publisher.
 *
 * D1-friendly: the admin must explicitly request each bounded page; no
 * total-count scan, automatic polling, prefetch, or image downloads.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CanonicalCatalogImage } from "@/components/catalog/CanonicalCatalogImage";
import { buildTonartCatalogReviewCsv } from "@/services/catalog/tonart-catalog-review-export";
import { CANONICAL_CATALOG_API_BASE } from "@/config/canonical-catalog-endpoint";
import { catalogModelDetailsPath } from "@/config/routes";
import {
  createPublicCatalogGateway,
  type PublicCatalogPage,
  type PublicCatalogModel,
  type PublicCatalogDetail,
  type PublicCatalogGalleryPage,
} from "@/services/catalog/public-catalog-gateway";
import { actionClass, secondaryClass } from "./CommercialPage";

const PAGE_SIZE = 12;

export default function TonartAdminCatalogReview() {
  const [draft, setDraft] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState<PublicCatalogPage | null>(null);
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [onlyWithoutCover, setOnlyWithoutCover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const reviewRef = useRef<AbortController | null>(null);
  const [selectedModel, setSelectedModel] = useState<PublicCatalogModel | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);
  const [review, setReview] = useState<{
    model: PublicCatalogDetail;
    gallery: PublicCatalogGalleryPage | null;
    pageIndex: number;
    cursors: Array<string | undefined>;
  } | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState("");

  const gateway = useMemo(() => {
    if (!CANONICAL_CATALOG_API_BASE) return null;
    try {
      return createPublicCatalogGateway(CANONICAL_CATALOG_API_BASE, fetch);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => () => {
    requestRef.current?.abort();
    reviewRef.current?.abort();
  }, []);

  useEffect(() => {
    // Preview is below the bounded table; bring it into view after an explicit
    // row action, without any additional catalog or media request.
    if (selectedModel) previewRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [selectedModel]);

  async function load(
    search: string,
    cursor: string | undefined,
    nextCursors: Array<string | undefined>,
    nextIndex: number,
  ) {
    if (!gateway) {
      setError("O catálogo canônico não está configurado neste ambiente.");
      return;
    }
    requestRef.current?.abort();
    reviewRef.current?.abort();
    setReview(null);
    setSelectedModel(null);
    setReviewError("");
    setReviewingId(null);
    const controller = new AbortController();
    requestRef.current = controller;
    setError("");
    setDownloadError("");
    setBusy(true);
    try {
      const response = await gateway.listPage(
        { search: search || undefined, limit: PAGE_SIZE, cursor },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setPage(response);
      setCursors(nextCursors);
      setPageIndex(nextIndex);
      setActiveSearch(search);
      setOnlyWithoutCover(false);
    } catch {
      if (!controller.signal.aborted) {
        setError("Não foi possível consultar a página do catálogo. Tente novamente.");
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = draft.trim();
    const length = Array.from(search).length;
    if (search && (length < 3 || length > 80)) {
      setError("A busca deve conter de 3 a 80 caracteres, ou estar vazia para listar modelos.");
      return;
    }
    void load(search, undefined, [undefined], 0);
  }

  async function inspectModel(model: PublicCatalogModel) {
    if (!gateway) return;
    reviewRef.current?.abort();
    const controller = new AbortController();
    reviewRef.current = controller;
    setReview(null);
    setReviewError("");
    setReviewingId(model.id);
    try {
      // Only after an explicit click: one model detail and one gallery page
      // (at most six entries), with no full-catalog scan or D1 write.
      const detail = await gateway.getModel(model.slug, controller.signal);
      if (detail.id !== model.id || detail.galleryVersion !== model.galleryVersion) {
        throw new Error("catalog_model_changed");
      }
      const gallery = detail.imageCount > 0
        ? await gateway.listGallery(detail.slug, {
            version: detail.galleryVersion,
            limit: Math.min(6, detail.imageCount),
            expectedTotal: detail.imageCount,
            expectedCoverStorageKey: detail.coverStorageKey ?? undefined,
          }, controller.signal)
        : null;
      if (!controller.signal.aborted) setReview({
        model: detail, gallery, pageIndex: 0, cursors: [undefined],
      });
    } catch {
      if (!controller.signal.aborted) {
        setReviewError("Não foi possível verificar os metadados dessa ficha. Ela pode ter sido atualizada ou estar com mídia inconsistente.");
      }
    } finally {
      if (!controller.signal.aborted) setReviewingId(null);
    }
  }

  async function moveGalleryPage(
    pageIndex: number,
    cursor: string | undefined,
    cursors: Array<string | undefined>,
  ) {
    if (!gateway || !review?.gallery || reviewingId !== null ||
        pageIndex < 0 || pageIndex * 6 >= review.model.imageCount) return;
    const current = review;
    // The existing gateway validates cursor syntax, gallery version, total
    // and each page. Never fetch unbounded galleries or skip page boundaries.
    if (cursor !== undefined && cursors.slice(0, -1).includes(cursor)) {
      setReviewError("A paginação da galeria está inconsistente. Reabra a ficha.");
      return;
    }
    reviewRef.current?.abort();
    const controller = new AbortController();
    reviewRef.current = controller;
    setReviewError("");
    setReviewingId(current.model.id);
    try {
      const gallery = await gateway.listGallery(current.model.slug, {
        version: current.model.galleryVersion,
        limit: Math.min(6, current.model.imageCount),
        cursor,
        expectedTotal: current.model.imageCount,
        // Only the first page has the canonical cover position guarantee.
        ...(cursor ? {} : { expectedCoverStorageKey: current.model.coverStorageKey ?? undefined }),
      }, controller.signal);
      if (controller.signal.aborted) return;
      setReview((latest) => latest?.model.id === current.model.id
        ? { ...latest, gallery, pageIndex, cursors } : latest);
    } catch {
      if (!controller.signal.aborted) {
        setReviewError("Não foi possível carregar esta página da galeria. A página anterior foi preservada.");
      }
    } finally {
      if (!controller.signal.aborted) setReviewingId(null);
    }
  }

  function showCover(model: PublicCatalogModel) {
    reviewRef.current?.abort();
    setReview(null);
    setReviewingId(null);
    setReviewError("");
    setSelectedModel((current) => current?.id === model.id ? null : model);
  }

  function closeCover() {
    reviewRef.current?.abort();
    setReview(null);
    setReviewingId(null);
    setReviewError("");
    setSelectedModel(null);
  }

  // Construct exactly one approved first-party image URL from the same
  // gateway as /modelos. No D1 lookup occurs when previewing a loaded row.
  const coverUrl = selectedModel?.coverStorageKey && gateway
    ? gateway.mediaUrl(selectedModel.coverStorageKey) : null;

  const visible = onlyWithoutCover
    ? page?.items.filter((model) => !model.coverStorageKey) ?? []
    : page?.items ?? [];
  const withoutCover = page?.items.filter((model) => !model.coverStorageKey).length ?? 0;

  function downloadCurrentReview() {
    if (!page || !visible.length || busy) return;
    setDownloadError("");
    let objectUrl: string | null = null;
    try {
      const csv = buildTonartCatalogReviewCsv(visible);
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
      objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `tonart-revisao-catalogo-pagina-${pageIndex + 1}.csv`;
      link.click();
    } catch {
      setDownloadError("Não foi possível gerar o relatório desta página.");
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  return (
    <section aria-label="Revisão do catálogo canônico">
      <h3 className="text-lg font-semibold">Catálogo de modelos</h3>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
        Consulta dos modelos publicados na mesma origem utilizada pelo catálogo dos clientes:
        Cloudflare D1/R2, através do gateway canônico da TONART. Nenhum modelo é copiado
        para o Supabase ou para outro inventário.
      </p>
      <form onSubmit={submit} className="mt-6 flex flex-wrap items-end gap-3" role="search">
        <label className="min-w-[220px] flex-1 text-xs text-white/75">
          <span className="mb-2 block">Buscar no catálogo publicado</span>
          <input
            aria-label="Buscar modelos do catálogo"
            type="search"
            value={draft}
            maxLength={80}
            placeholder="Nome, código ou personagem"
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-11 w-full rounded-sm border border-white/25 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[hsl(var(--gold-accent))]"
          />
        </label>
        <button className={actionClass} type="submit" disabled={busy || gateway === null}>
          {busy ? "Consultando..." : page ? "Pesquisar" : "Carregar modelos"}
        </button>
      </form>

      {!gateway && (
        <p role="alert" className="mt-5 border border-red-500/40 p-4 text-sm">
          O endpoint canônico está indisponível. Nenhuma fonte alternativa será utilizada.
        </p>
      )}
      {error && <p role="alert" className="mt-5 border border-red-500/40 p-4 text-sm text-red-200">{error}</p>}
      {busy && <p role="status" className="mt-4 text-sm text-white/65">Consultando uma página do catálogo...</p>}

      {page && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5">
            <div>
              <p className="text-sm font-medium">
                Página {pageIndex + 1} · {page.items.length} modelos publicáveis nesta página
              </p>
              <p className="mt-1 text-xs text-white/55">
                {activeSearch ? "Busca: " + activeSearch : "Sem filtro de busca"} ·
                {" "} {withoutCover} sem chave de capa nesta página
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-white/75">
              <input
                type="checkbox"
                checked={onlyWithoutCover}
                onChange={(event) => setOnlyWithoutCover(event.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--gold-accent))]"
              />
              Mostrar apenas modelos sem capa nesta página
            </label>
          </div>
          {visible.length === 0 ? (
            <p className="mt-5 border border-white/15 p-5 text-sm text-white/65">
              {onlyWithoutCover
                ? "Nenhum modelo sem chave de capa nesta página."
                : "Nenhum modelo publicável nesta página. Confira os filtros ou avance se houver outra página."}
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                <thead className="border-b border-white/20 text-xs text-white/60">
                  <tr>
                    <th className="py-3 pr-3">Modelo</th>
                    <th className="py-3 pr-3">Categoria / franquia</th>
                    <th className="py-3 pr-3">Imagens</th>
                    <th className="py-3 pr-3">Capa</th>
                    <th className="py-3 text-right">Catálogo</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((model) => (
                    <tr key={model.id} className="border-b border-white/10">
                      <td className="py-4 pr-4">
                        <span className="block font-semibold">{model.name}</span>
                        <span className="mt-1 block text-xs text-white/50">
                          {model.code}{model.variantName ? " · " + model.variantName : ""}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        {model.category}
                        <span className="block text-xs text-white/55">{model.franchise}</span>
                      </td>
                      <td className="py-4 pr-3 tabular-nums">{model.imageCount}</td>
                      <td className="py-4 pr-3 text-xs">
                        {model.coverStorageKey ? "Chave cadastrada" : "Sem chave de capa"}
                      </td>
                      <td className="py-4 text-right">
                        <button
                          className="mb-2 block w-full text-right text-xs text-[hsl(var(--gold-accent))] underline underline-offset-4 disabled:opacity-50"
                          type="button"
                          disabled={busy || reviewingId !== null}
                          onClick={() => showCover(model)}
                        >
                          {selectedModel?.id === model.id ? "Fechar imagem" : "Ver imagem"}
                        </button>
                        <Link
                          className="text-xs text-[hsl(var(--gold-accent))] underline underline-offset-4"
                          to={catalogModelDetailsPath(model.id, model.name)}
                        >
                          Abrir ficha
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {selectedModel && (
            <section ref={previewRef} aria-label="Visualização da capa" className="mt-6 border border-white/20 p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-lg font-semibold">Capa: {selectedModel.name}</h4>
                <button type="button" className={secondaryClass} onClick={closeCover}>
                  Fechar visualização
                </button>
              </div>
              <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.75fr)]">
                <div className="flex min-h-[260px] items-center justify-center overflow-hidden rounded-sm border border-white/15 bg-black/40 p-3">
                  {coverUrl ? (
                    <CanonicalCatalogImage
                      src={coverUrl}
                      alt={"Capa do modelo " + selectedModel.name}
                      loading="eager"
                      imageClassName="block max-h-[420px] w-full object-contain"
                      fallbackClassName="flex min-h-[240px] w-full flex-col items-center justify-center gap-3 text-center text-sm text-white/60"
                      fallbackLabel="Imagem indisponível. Não foi possível carregar a capa."
                    />
                  ) : (
                    <p role="status" className="px-4 text-center text-sm text-white/65">
                      {selectedModel.coverStorageKey
                        ? "Esta capa não está disponível para visualização pública."
                        : "Este modelo não possui capa cadastrada."}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-start gap-3 text-sm text-white/70">
                  <p>
                    Prévia da capa publicada no catálogo. Se a imagem não aparecer, você verá
                    uma mensagem de indisponibilidade no lugar dela.
                  </p>
                  <p className="text-xs text-white/55">
                    A imagem é carregada somente após clicar em “Ver imagem”, sem consultar
                    novamente a lista de modelos.
                  </p>
                  <Link
                    className="text-sm text-[hsl(var(--gold-accent))] underline underline-offset-4"
                    to={catalogModelDetailsPath(selectedModel.id, selectedModel.name)}
                  >
                    Abrir ficha pública do modelo
                  </Link>
                  <button
                    type="button"
                    className={secondaryClass}
                    disabled={busy || reviewingId !== null}
                    onClick={() => { void inspectModel(selectedModel); }}
                  >
                    {reviewingId === selectedModel.id ? "Carregando galeria..." : "Ver galeria (6 fotos por página)"}
                  </button>
                </div>
              </div>
            </section>
          )}
          {reviewingId && <p role="status" className="mt-5 text-sm text-white/65">Carregando fotos do modelo selecionado...</p>}
          {reviewError && <p role="alert" className="mt-5 border border-amber-500/40 p-4 text-sm">{reviewError}</p>}
          {review && (
            <section aria-label="Resultado da verificação individual" className="mt-6 border border-white/20 p-5">
              <h4 className="text-base font-semibold">Galeria: {review.model.name}</h4>
              <p className="mt-2 text-sm text-white/65">
                {review.model.imageCount} imagem(ns) cadastrada(s) no catálogo.
                {" "}Página {review.pageIndex + 1}: {review.gallery ? review.gallery.items.length : 0} foto(s).
                Outras páginas são carregadas somente quando você solicitar.
              </p>
              <p className="mt-2 text-sm text-white/70">
                Capa no índice: {review.model.coverStorageKey ? "chave cadastrada" : "sem chave de capa"}.
                {" "}Versão da galeria: {review.model.galleryVersion}.
              </p>
              {review.gallery && review.gallery.items.length > 0 && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Fotos da galeria">
                  {review.gallery.items.map((image, index) => {
                    // Prefer published low-resolution variants. The same
                    // SSOT allowlist/quarantine as the public model page
                    // applies to every image URL and fallback.
                    const key = image.variantKeys.thumb ??
                      image.variantKeys.card ?? image.variantKeys.detail;
                    const backupKey = image.variantKeys.thumb
                      ? (image.variantKeys.card ?? image.variantKeys.detail)
                      : image.variantKeys.card
                        ? image.variantKeys.detail
                        : null;
                    const src = gateway?.mediaUrl(key) ?? null;
                    const fallbackSrc = backupKey && backupKey !== key
                      ? gateway?.mediaUrl(backupKey) ?? null
                      : null;
                    return (
                      <figure key={image.id} className="min-w-0 border border-white/15 bg-black/25 p-3">
                        <div className="flex aspect-[4/5] items-center justify-center overflow-hidden bg-black/35">
                          <CanonicalCatalogImage
                            src={src}
                            fallbackSrc={fallbackSrc}
                            alt={`Foto ${review.pageIndex * 6 + index + 1} do modelo ${review.model.name}`}
                            loading="lazy"
                            imageClassName="h-full w-full object-contain"
                            fallbackClassName="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-xs text-white/60"
                            fallbackLabel="Imagem indisponível"
                          />
                        </div>
                        <figcaption className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-white/60">
                          <span>Foto {review.pageIndex * 6 + index + 1}</span>
                          <span>{image.role === "cover" ? "Capa" : "Galeria"}</span>
                        </figcaption>
                      </figure>
                    );
                  })}
                </div>
              )}
              {review.gallery && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3" aria-label="Paginação das fotos">
                  <span className="text-xs text-white/60">
                    Página {review.pageIndex + 1} · {review.gallery.items.length} fotos carregadas
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={secondaryClass}
                      disabled={reviewingId !== null || review.pageIndex === 0}
                      onClick={() => {
                        const index = review.pageIndex - 1;
                        void moveGalleryPage(index, review.cursors[index], review.cursors.slice(0, index + 1));
                      }}
                    >
                      Fotos anteriores
                    </button>
                    <button
                      type="button"
                      className={secondaryClass}
                      disabled={reviewingId !== null || !review.gallery?.nextCursor}
                      onClick={() => {
                        if (!review.gallery?.nextCursor) return;
                        const index = review.pageIndex + 1;
                        void moveGalleryPage(
                          index, review.gallery.nextCursor,
                          [...review.cursors.slice(0, index), review.gallery.nextCursor],
                        );
                      }}
                    >
                      Próximas fotos
                    </button>
                  </div>
                </div>
              )}
              {review.gallery && review.gallery.items.length === 0 && (
                <p className="mt-4 text-sm text-white/60">Nenhuma foto disponível nesta galeria.</p>
              )}
              {!review.gallery && (
                <p className="mt-4 text-sm text-white/60">Este modelo não possui fotos cadastradas.</p>
              )}
              {review.gallery && (
                <details className="mt-5 border-t border-white/15 pt-4">
                  <summary className="cursor-pointer text-sm text-[hsl(var(--gold-accent))]">
                    Informações técnicas (opcional)
                  </summary>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[430px] border-collapse text-left text-xs">
                      <thead className="border-b border-white/20 text-white/55">
                        <tr><th className="py-2 pr-3">Papel</th><th className="py-2 pr-3">Formato</th><th className="py-2 pr-3">Dimensões</th><th className="py-2">Versões disponíveis</th></tr>
                      </thead>
                      <tbody>
                        {review.gallery.items.map((image) => (
                          <tr key={image.id} className="border-b border-white/10">
                            <td className="py-3 pr-3">{image.role === "cover" ? "Capa" : "Galeria"}</td>
                            <td className="py-3 pr-3">{image.mime}</td>
                            <td className="py-3 pr-3">{image.width} × {image.height}</td>
                            <td className="py-3">{Object.entries(image.variantKeys)
                              .filter(([, key]) => Boolean(key))
                              .map(([kind]) => kind).join(", ") || "Nenhuma"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
              <p className="mt-4 text-xs leading-5 text-white/50">
                As fotos e informações usam o catálogo público canônico. A disponibilidade de uma miniatura
                não comprova a integridade das demais versões nem a ausência de marcas d’água.
                A publicação e a correção de mídia continuam com o único publicador canônico.
              </p>
              <Link className="mt-3 inline-block text-sm text-[hsl(var(--gold-accent))] underline" to={catalogModelDetailsPath(review.model.id, review.model.name)}>
                Abrir ficha para revisão visual
              </Link>
            </section>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-xs text-white/50">
              Somente a página solicitada é consultada. Os totais acima não representam o acervo inteiro.
              Use “Ver imagem” para conferir a capa real de cada modelo.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={secondaryClass}
                disabled={busy || visible.length === 0}
                onClick={downloadCurrentReview}
              >
                Baixar relação desta página (CSV)
              </button>
              <button
                type="button"
                className={secondaryClass}
                disabled={busy || pageIndex === 0}
                onClick={() => {
                  const index = pageIndex - 1;
                  if (index < 0) return;
                  void load(activeSearch, cursors[index], cursors.slice(0, index + 1), index);
                }}
              >
                Página anterior
              </button>
              <button
                type="button"
                className={secondaryClass}
                disabled={busy || !page.nextCursor}
                onClick={() => {
                  if (!page.nextCursor) return;
                  const index = pageIndex + 1;
                  void load(activeSearch, page.nextCursor, [...cursors.slice(0, index), page.nextCursor], index);
                }}
              >
                Próxima página
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/50">
            A relação inclui apenas {visible.length} modelo(s) desta página{onlyWithoutCover ? " sem chave de capa" : ""}.
            É um arquivo de consulta; não altera modelos nem publica mídias.
          </p>
          {downloadError && <p role="alert" className="mt-3 text-sm text-amber-200">{downloadError}</p>}
        </>
      )}
      <div className="mt-7 border-t border-white/15 pt-5">
        <p className="text-xs leading-5 text-white/55">
          Esta é uma ferramenta de inspeção do catálogo público. Modelos ocultados pelas regras canônicas
          de revisão, inclusive SpecialSTL, não aparecem aqui. Alterações no acervo, capas ou publicação
          continuam sob responsabilidade do sistema canônico Cloudflare; a TONART não abre uma segunda
          rota de escrita nem modifica a base D1.
        </p>
        <Link className={secondaryClass + " mt-4"} to="/modelos">
          Abrir catálogo público
        </Link>
      </div>
    </section>
  );
}
