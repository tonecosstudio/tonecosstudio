import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ImageOff, Search, X } from "lucide-react";
import {
  MAX_CANONICAL_SELECTION,
  toggleCanonicalSelection,
} from "@/services/catalog/public-catalog-selection";
import { Page } from "@/components/layouts/Page";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createPublicCatalogGateway,
  type PublicCatalogModel,
} from "@/services/catalog/public-catalog-gateway";

const PAGE_SIZE = 24;
const API_BASE = import.meta.env.VITE_CANONICAL_CATALOG_API_BASE?.trim() ?? "";

type PagePosition = {
  scope: string;
  cursors: Array<string | undefined>;
  index: number;
};

function ModelCover({
  model,
  mediaUrl,
}: {
  model: PublicCatalogModel;
  mediaUrl: (key: string | null) => string | null;
}) {
  const url = mediaUrl(model.coverStorageKey);
  return (
    <div className="flex aspect-[4/5] items-center justify-center overflow-hidden bg-[hsl(var(--tonecos-soft))]">
      {url ? (
        <img
          src={url}
          alt={"Imagem de referência: " + model.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.025]"
        />
      ) : (
        <span className="flex flex-col items-center gap-2 text-[hsl(var(--tonecos-muted))]">
          <ImageOff aria-hidden="true" size={26} strokeWidth={1.4} />
          <span className="text-xs">Imagem indisponível</span>
        </span>
      )}
    </div>
  );
}

export default function CatalogModelsArcade() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const [draft, setDraft] = useState(search);
  const [loadCategories, setLoadCategories] = useState(Boolean(category));
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<PublicCatalogModel[]>(
    [],
  );
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [paging, setPaging] = useState<PagePosition>({
    scope: "",
    cursors: [undefined],
    index: 0,
  });

  useEffect(() => setDraft(search), [search]);

  const gateway = useMemo(() => {
    if (!API_BASE) return null;
    try {
      return createPublicCatalogGateway(API_BASE, fetch);
    } catch {
      return null;
    }
  }, []);

  const scope = JSON.stringify([search, category]);
  const activePage =
    paging.scope === scope ? paging : { scope, cursors: [undefined], index: 0 };
  const cursor = activePage.cursors[activePage.index];
  const invalidSearch = search.length > 0 && Array.from(search).length < 3;

  const categories = useQuery({
    queryKey: ["tonecos-catalog-categories"],
    queryFn: ({ signal }) => gateway!.listCategories(signal),
    enabled: gateway !== null && loadCategories,
    retry: false,
    staleTime: 15 * 60 * 1000,
  });

  const models = useQuery({
    queryKey: ["tonecos-catalog-list", scope, cursor],
    queryFn: ({ signal }) =>
      gateway!.listPage(
        {
          category: category || undefined,
          search: search || undefined,
          limit: PAGE_SIZE,
          cursor,
        },
        signal,
      ),
    enabled: gateway !== null && !invalidSearch,
    retry: false,
    staleTime: 60 * 1000,
  });

  const detail = useQuery({
    queryKey: ["tonecos-catalog-detail", detailSlug],
    queryFn: ({ signal }) => gateway!.getModel(detailSlug!, signal),
    enabled: gateway !== null && detailSlug !== null,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const rows = models.data?.items ?? [];

  function toggleSelected(model: PublicCatalogModel) {
    setSelectedModels((current) => toggleCanonicalSelection(current, model));
  }

  function changeParams(nextSearch: string, nextCategory: string) {
    const next = new URLSearchParams();
    if (nextSearch) next.set("q", nextSearch);
    if (nextCategory && nextCategory !== "all")
      next.set("category", nextCategory);
    setSearchParams(next);
    setDetailSlug(null);
  }

  function goNext() {
    if (!models.data?.nextCursor) return;
    setPaging({
      scope,
      cursors: [
        ...activePage.cursors.slice(0, activePage.index + 1),
        models.data.nextCursor,
      ],
      index: activePage.index + 1,
    });
    setDetailSlug(null);
  }

  function goBack() {
    if (activePage.index === 0) return;
    setPaging({ ...activePage, index: activePage.index - 1 });
    setDetailSlug(null);
  }

  return (
    <Page
      title="Catálogo de modelos"
      description="Explore referências de esculturas e modelos do acervo Tonecos Studio, com busca por categoria e navegação paginada."
      keywords={["tonecos", "esculturas", "modelos", "catálogo"]}
    >
      <section className="min-h-[80vh] bg-[hsl(var(--tonecos-paper))] pb-20 text-[hsl(var(--tonecos-ink))]">
        <header className="border-b border-[hsl(var(--tonecos-line))]">
          <div className="mx-auto max-w-7xl px-4 pb-9 pt-12 md:px-8 md:pb-12 md:pt-16">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--tonecos-accent))]">
              Tonecos Studio · Acervo
            </p>
            <h1 className="max-w-3xl text-4xl leading-tight md:text-5xl">
              Encontre a peça que você procura.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--tonecos-muted))]">
              Explore modelos publicados por categoria ou nome. Cada peça possui
              sua própria referência e poderá fazer parte de uma solicitação de
              orçamento quando a integração comercial estiver disponível.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 pt-8 md:px-8">
          <form
            role="search"
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_230px_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              changeParams(draft.trim(), category);
            }}
          >
            <label className="relative block">
              <span className="sr-only">Pesquisar modelos</span>
              <Search
                aria-hidden="true"
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--tonecos-muted))]"
              />
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={80}
                placeholder="Buscar modelos ou personagens"
                className="h-12 w-full rounded-md border border-[hsl(var(--tonecos-line))] bg-[hsl(var(--tonecos-panel))] pl-12 pr-12 text-sm outline-none transition-colors focus-visible:border-[hsl(var(--tonecos-accent))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--tonecos-accent)/0.2)]"
              />
              {draft && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => {
                    setDraft("");
                    changeParams("", category);
                  }}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md hover:bg-[hsl(var(--tonecos-soft))]"
                >
                  <X size={17} aria-hidden="true" />
                </button>
              )}
            </label>
            <label className="block">
              <span className="sr-only">Filtrar por categoria</span>
              <select
                value={category}
                onChange={(event) => changeParams(search, event.target.value)}
                onFocus={() => setLoadCategories(true)}
                onPointerDown={() => setLoadCategories(true)}
                aria-busy={loadCategories && categories.isFetching}
                disabled={
                  gateway === null || (loadCategories && categories.isError)
                }
                className="h-12 w-full rounded-md border border-[hsl(var(--tonecos-line))] bg-[hsl(var(--tonecos-panel))] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--tonecos-accent)/0.2)] disabled:opacity-60"
              >
                <option value="">Todas as categorias</option>
                {categories.data
                  ?.filter((item) => item.id !== "all")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="submit"
              className="h-12 rounded-md bg-[hsl(var(--tonecos-accent))] px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Buscar
            </button>
          </form>

          <div className="mb-5 mt-10 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--tonecos-muted))]">
                Coleção de referências
              </p>
              <h2 className="mt-1 text-2xl">Explorar modelos</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {models.isSuccess && (
                <p
                  className="text-sm text-[hsl(var(--tonecos-muted))]"
                  aria-live="polite"
                >
                  Página {activePage.index + 1} · {rows.length} modelos nesta
                  página
                </p>
              )}
              <button
                type="button"
                onClick={() => setSelectionOpen(true)}
                aria-label={
                  "Abrir seleção para orçamento com " +
                  selectedModels.length +
                  " modelos"
                }
                className="inline-flex min-h-11 items-center rounded-md border border-[hsl(var(--tonecos-accent))] px-4 text-sm font-semibold text-[hsl(var(--tonecos-accent))] hover:bg-[hsl(var(--tonecos-soft))]"
              >
                Minha seleção ({selectedModels.length}/{MAX_CANONICAL_SELECTION}
                )
              </button>
            </div>
          </div>

          {gateway === null ? (
            <div
              role="status"
              className="rounded-lg border border-[hsl(var(--tonecos-line))] bg-[hsl(var(--tonecos-panel))] p-8"
            >
              <h3 className="text-xl">Catálogo em integração</h3>
              <p className="mt-2 max-w-xl text-sm text-[hsl(var(--tonecos-muted))]">
                A origem oficial do catálogo ainda não foi configurada neste
                ambiente. Nenhum modelo ou preço será apresentado como
                disponível sem essa validação.
              </p>
            </div>
          ) : invalidSearch ? (
            <p
              role="status"
              className="rounded-lg bg-[hsl(var(--tonecos-panel))] p-7 text-sm"
            >
              Utilize ao menos três caracteres na pesquisa.
            </p>
          ) : models.isPending ? (
            <p
              role="status"
              className="rounded-lg bg-[hsl(var(--tonecos-panel))] p-7 text-sm"
            >
              Carregando os modelos publicados…
            </p>
          ) : models.isError ? (
            <div
              role="alert"
              className="rounded-lg border border-[hsl(var(--tonecos-line))] bg-[hsl(var(--tonecos-panel))] p-7"
            >
              <h3 className="text-lg">Não foi possível consultar o acervo.</h3>
              <p className="mt-2 text-sm text-[hsl(var(--tonecos-muted))]">
                Verifique a conexão e tente novamente. Não exibimos resultados
                antigos como se estivessem disponíveis.
              </p>
              <button
                type="button"
                onClick={() => void models.refetch()}
                className="mt-4 rounded-md border border-[hsl(var(--tonecos-accent))] px-4 py-2 text-sm"
              >
                Tentar novamente
              </button>
            </div>
          ) : rows.length === 0 ? (
            <p
              role="status"
              className="rounded-lg bg-[hsl(var(--tonecos-panel))] p-7 text-sm"
            >
              Nenhum modelo publicado corresponde aos filtros utilizados.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
              {rows.map((model) => {
                const isSelected = selectedModels.some(
                  (item) => item.id === model.id,
                );
                return (
                  <article
                    key={model.id}
                    className="group overflow-hidden rounded-lg border border-[hsl(var(--tonecos-line))] bg-[hsl(var(--tonecos-panel))] text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => setDetailSlug(model.slug)}
                      aria-label={"Ver detalhes de " + model.name}
                      className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--tonecos-accent))]"
                    >
                      <ModelCover
                        model={model}
                        mediaUrl={(key) => gateway.mediaUrl(key)}
                      />
                      <div className="space-y-1.5 p-3 md:p-4">
                        <p className="line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-snug md:text-base">
                          {model.name}
                        </p>
                        <p className="truncate text-xs text-[hsl(var(--tonecos-muted))]">
                          {model.variantName || model.franchise}
                        </p>
                        <p className="text-xs text-[hsl(var(--tonecos-muted))]">
                          {model.code}
                        </p>
                        <p className="pt-1 text-xs font-semibold text-[hsl(var(--tonecos-accent))]">
                          Ver detalhes
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSelected(model)}
                      disabled={
                        !isSelected &&
                        selectedModels.length >= MAX_CANONICAL_SELECTION
                      }
                      aria-pressed={isSelected}
                      className="mx-3 mb-3 flex min-h-11 w-[calc(100%-1.5rem)] items-center justify-center rounded-md border border-[hsl(var(--tonecos-line))] px-2 text-xs font-medium transition-colors hover:border-[hsl(var(--tonecos-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSelected
                        ? "Remover da seleção"
                        : "Adicionar à seleção"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          {models.isSuccess &&
            (activePage.index > 0 || !!models.data.nextCursor) && (
              <nav
                aria-label="Páginas do catálogo"
                className="mt-10 flex items-center justify-center gap-4"
              >
                <button
                  type="button"
                  onClick={goBack}
                  disabled={activePage.index === 0}
                  className="inline-flex h-11 items-center gap-2 rounded-md border border-[hsl(var(--tonecos-line))] px-4 text-sm disabled:opacity-40"
                >
                  <ArrowLeft size={16} aria-hidden="true" /> Anterior
                </button>
                <span className="text-sm text-[hsl(var(--tonecos-muted))]">
                  {activePage.index + 1}
                </span>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!models.data.nextCursor}
                  className="inline-flex h-11 items-center gap-2 rounded-md border border-[hsl(var(--tonecos-line))] px-4 text-sm disabled:opacity-40"
                >
                  Próxima <ArrowRight size={16} aria-hidden="true" />
                </button>
              </nav>
            )}
        </div>
      </section>

      <Dialog
        open={detailSlug !== null}
        onOpenChange={(open) => !open && setDetailSlug(null)}
      >
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto bg-[hsl(var(--tonecos-panel))] text-[hsl(var(--tonecos-ink))]">
          <DialogHeader>
            <DialogTitle>Detalhes do modelo</DialogTitle>
            <DialogDescription>
              Referências publicadas no catálogo Tonecos Studio.
            </DialogDescription>
          </DialogHeader>
          {detail.isPending ? (
            <p role="status">Carregando informações do modelo…</p>
          ) : detail.isError ? (
            <p role="alert">Detalhes indisponíveis no momento.</p>
          ) : detail.data ? (
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <ModelCover
                model={detail.data}
                mediaUrl={(key) => gateway?.mediaUrl(key) ?? null}
              />
              <div className="space-y-3">
                <h3 className="text-xl">{detail.data.name}</h3>
                {detail.data.variantName && (
                  <p className="text-sm">{detail.data.variantName}</p>
                )}
                <p className="text-sm text-[hsl(var(--tonecos-muted))]">
                  {detail.data.franchise} · {detail.data.code}
                </p>
                {detail.data.description && (
                  <p className="text-sm leading-relaxed">
                    {detail.data.description}
                  </p>
                )}
                {detail.data.material && (
                  <p className="text-sm">Material: {detail.data.material}</p>
                )}
                {detail.data.heightCm !== null && (
                  <p className="text-sm">
                    Altura de referência: {detail.data.heightCm} cm
                  </p>
                )}
                <p className="border-t border-[hsl(var(--tonecos-line))] pt-3 text-xs leading-relaxed text-[hsl(var(--tonecos-muted))]">
                  Exibição informativa. Valores, fabricação e disponibilidade
                  são confirmados somente na etapa comercial de orçamento.
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={selectionOpen} onOpenChange={setSelectionOpen}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto bg-[hsl(var(--tonecos-panel))] text-[hsl(var(--tonecos-ink))]">
          <DialogHeader>
            <DialogTitle>Minha seleção</DialogTitle>
            <DialogDescription>
              Modelos reunidos para preparar um orçamento, sem envio automático.
            </DialogDescription>
          </DialogHeader>
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-[hsl(var(--tonecos-muted))]"
          >
            {selectedModels.length} de {MAX_CANONICAL_SELECTION} modelos
            selecionados.
          </p>
          {selectedModels.length === 0 ? (
            <p className="rounded-md bg-[hsl(var(--tonecos-soft))] p-4 text-sm">
              Sua seleção está vazia. Escolha modelos no catálogo para começar.
            </p>
          ) : (
            <ul className="max-h-[50dvh] space-y-2 overflow-y-auto">
              {selectedModels.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-[hsl(var(--tonecos-line))] p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {item.name}
                    </p>
                    <p className="text-xs text-[hsl(var(--tonecos-muted))]">
                      {item.code}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSelected(item)}
                    aria-label={"Remover " + item.name + " da seleção"}
                    className="min-h-11 shrink-0 rounded-md border border-[hsl(var(--tonecos-line))] px-3 text-xs"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-[hsl(var(--tonecos-line))] pt-4 text-xs leading-relaxed text-[hsl(var(--tonecos-muted))]">
            A seleção é temporária e permanece apenas nesta página. A
            solicitação comercial será liberada depois da integração de preços,
            autenticação e pedidos com o Studio. Nenhum orçamento foi enviado.
          </p>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
