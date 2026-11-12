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
  const requestRef = useRef<AbortController | null>(null);
  const reviewRef = useRef<AbortController | null>(null);
  const [selectedModel, setSelectedModel] = useState<PublicCatalogModel | null>(null);
  const [review, setReview] = useState<{
    model: PublicCatalogDetail;
    gallery: PublicCatalogGalleryPage | null;
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
    setReviewError("");
    setReviewingId(null);
    const controller = new AbortController();
    requestRef.current = controller;
    setError("");
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
      // One user-requested detail and at most one six-item gallery page.
      // Never query the entire collection, download images or write to D1/R2.
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
      if (!controller.signal.aborted) setReview({ model: detail, gallery });
    } catch {
      if (!controller.signal.aborted) {
        setReviewError("Não foi possível verificar os metadados dessa ficha. Ela pode ter sido atualizada ou estar com mídia inconsistente.");
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
            <section aria-label="Visualização da capa" className="mt-6 border border-white/20 p-4 sm:p-6">
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
                    {reviewingId === selectedModel.id ? "Consultando dados..." : "Informações técnicas (opcional)"}
                  </button>
                </div>
              </div>
            </section>
          )}
          {reviewingId && <p role="status" className="mt-5 text-sm text-white/65">Verificando apenas o modelo selecionado...</p>}
          {reviewError && <p role="alert" className="mt-5 border border-amber-500/40 p-4 text-sm">{reviewError}</p>}
          {review && (
            <section aria-label="Resultado da verificação individual" className="mt-6 border border-white/20 p-5">
              <h4 className="text-base font-semibold">Informações da mídia: {review.model.name}</h4>
              <p className="mt-2 text-sm text-white/65">
                Ficha atual consultada na origem canônica. {review.model.imageCount} imagens declaradas;
                {" "}{review.gallery ? review.gallery.items.length : 0} registros da galeria examinados
                (máximo de 6).
              </p>
              <p className="mt-2 text-sm text-white/70">
                Capa no índice: {review.model.coverStorageKey ? "chave cadastrada" : "sem chave de capa"}.
                {" "}Versão da galeria: {review.model.galleryVersion}.
              </p>
              {review.gallery && (
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
              )}
              <p className="mt-4 text-xs leading-5 text-white/50">
                Estas informações vêm do índice publicado e não substituem a visualização da capa.
                Não comprovam ausência de marcas d’água ou direitos de uso.
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
            <div className="flex gap-2">
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
