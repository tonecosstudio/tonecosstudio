import { useEffect, useMemo, useState } from "react";
import { useCatalogBrowsing } from "@/services/catalog/catalog-browsing-context";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ImageOff, Search, X } from "lucide-react";
import {
  MAX_CANONICAL_SELECTION,
  toggleCanonicalSelection,
} from "@/services/catalog/public-catalog-selection";
import { Page } from "@/components/layouts/Page";
import {
  ArcadeCard,
  ArcadeHero,
  ArcadeSectionTitle,
} from "@/components/arcade/ArcadeLayout";
import { catalogModelDetailsPath } from "@/config/routes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CANONICAL_CATALOG_API_BASE } from "@/config/canonical-catalog-endpoint";
import {
  createPublicCatalogGateway,
  type PublicCatalogModel,
} from "@/services/catalog/public-catalog-gateway";

const PAGE_SIZE = 24;
const API_BASE = CANONICAL_CATALOG_API_BASE;

function ModelCover({
  model,
  mediaUrl,
}: {
  model: PublicCatalogModel;
  mediaUrl: (key: string | null) => string | null;
}) {
  const url = mediaUrl(model.coverStorageKey);
  return (
    <div className="flex aspect-[3/4] items-center justify-center overflow-hidden bg-[hsl(0,0%,9%)]">
      {url ? (
        <img
          src={url}
          alt={"Imagem de referência: " + model.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.025]"
        />
      ) : (
        <span className="flex flex-col items-center gap-2 text-[hsl(0,0%,56%)]">
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
  const franchise = searchParams.get("franchise")?.trim() ?? "";
  const folder = searchParams.get("folder")?.trim() ?? "";
  const [draft, setDraft] = useState(search);
  const [loadCategories, setLoadCategories] = useState(Boolean(category));
  const [loadFranchises, setLoadFranchises] = useState(Boolean(franchise));
  const [franchiseDraft, setFranchiseDraft] = useState("");
  const [franchiseNeedle, setFranchiseNeedle] = useState("");
  const { selectedModels, setSelectedModels, paging, setPaging } =
    useCatalogBrowsing();
  const [selectionOpen, setSelectionOpen] = useState(false);

  useEffect(() => setDraft(search), [search]);

  const gateway = useMemo(() => {
    if (!API_BASE) return null;
    try {
      return createPublicCatalogGateway(API_BASE, fetch);
    } catch {
      return null;
    }
  }, []);

  const scope = JSON.stringify([search, category, franchise, folder]);
  const activePage =
    paging.scope === scope ? paging : { scope, cursors: [undefined], index: 0 };
  const cursor = activePage.cursors[activePage.index];
  const invalidSearch = search.length > 0 && Array.from(search).length < 3;
  const invalidFolderScope = Boolean(folder && (!category || !franchise));

  const categories = useQuery({
    queryKey: ["tonecos-catalog-categories"],
    queryFn: ({ signal }) => gateway!.listCategories(signal),
    enabled: gateway !== null && loadCategories,
    retry: false,
    staleTime: 15 * 60 * 1000,
  });

  const franchises = useQuery({
    queryKey: ["tonecos-catalog-franchises", category, franchiseNeedle],
    queryFn: ({ signal }) =>
      gateway!.listFranchises(
        {
          category: category || undefined,
          search: franchiseNeedle || undefined,
          limit: 24,
        },
        signal,
      ),
    enabled: gateway !== null && loadFranchises,
    retry: false,
    staleTime: 15 * 60 * 1000,
  });

  const models = useQuery({
    queryKey: ["tonecos-catalog-list", scope, cursor],
    queryFn: ({ signal }) =>
      gateway!.listPage(
        {
          category: category || undefined,
          franchise: franchise || undefined,
          folder: folder || undefined,
          search: search || undefined,
          limit: PAGE_SIZE,
          cursor,
        },
        signal,
      ),
    enabled: gateway !== null && !invalidSearch && !invalidFolderScope,
    retry: false,
    staleTime: 60 * 1000,
  });

  const rows = models.data?.items ?? [];

  function toggleSelected(model: PublicCatalogModel) {
    setSelectedModels((current) => toggleCanonicalSelection(current, model));
  }

  function changeParams(
    nextSearch: string,
    nextCategory: string,
    nextFranchise = franchise,
    keepFolder = true,
  ) {
    const next = new URLSearchParams();
    if (nextSearch) next.set("q", nextSearch);
    if (nextCategory && nextCategory !== "all")
      next.set("category", nextCategory);
    if (nextFranchise) next.set("franchise", nextFranchise);
    if (keepFolder && folder && nextCategory === category && nextFranchise === franchise) {
      next.set("folder", folder);
    }
    setSearchParams(next);
  }

  function findFranchises() {
    const query = franchiseDraft.trim();
    const length = Array.from(query).length;
    if (query && (length < 3 || length > 80)) return;
    setFranchiseNeedle(query);
    setLoadFranchises(true);
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
  }

  function goBack() {
    if (activePage.index === 0) return;
    setPaging({ ...activePage, index: activePage.index - 1 });
  }

  return (
    <Page
      title="Catálogo de modelos"
      description="Explore referências de esculturas e modelos do acervo Tonecos Studio, com busca por categoria e navegação paginada."
      keywords={["tonecos", "esculturas", "modelos", "catálogo"]}
    >
      <section className="min-h-[80vh] bg-[hsl(0,0%,4%)] pb-20 text-[hsl(0,0%,94%)]">
        <ArcadeHero
          badge="ACERVO TONECOS"
          title="MODELOS"
          subtitle=">> BUSCA, CATEGORIAS E REFERÊNCIAS DO ACERVO."
          stats={[{ value: activePage.index + 1, label: "Página" }]}
        />

        <div className="relative z-10 mx-auto -mt-4 max-w-7xl px-4 md:px-6">
          <form
            role="search"
            className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_190px_190px_auto]"
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
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(0,0%,56%)]"
              />
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={80}
                placeholder="Buscar modelos ou personagens"
                className="h-12 w-full rounded-none border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] pl-12 pr-12 text-sm outline-none transition-colors focus-visible:border-[hsl(var(--gold-accent))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold-accent)/0.2)]"
              />
              {draft && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => {
                    setDraft("");
                    changeParams("", category);
                  }}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-none hover:bg-[hsl(0,0%,9%)]"
                >
                  <X size={17} aria-hidden="true" />
                </button>
              )}
            </label>
            <label className="block">
              <span className="sr-only">Filtrar por categoria</span>
              <select
                value={category}
                onChange={(event) => {
                  setFranchiseDraft("");
                  setFranchiseNeedle("");
                  changeParams(search, event.target.value, "");
                }}
                onFocus={() => setLoadCategories(true)}
                onPointerDown={() => setLoadCategories(true)}
                aria-busy={loadCategories && categories.isFetching}
                disabled={
                  gateway === null || (loadCategories && categories.isError)
                }
                className="h-12 w-full rounded-none border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold-accent)/0.2)] disabled:opacity-60"
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
            <label className="block">
              <span className="sr-only">Filtrar por franquia</span>
              <select
                value={franchise}
                onChange={(event) =>
                  changeParams(search, category, event.target.value)
                }
                onFocus={() => setLoadFranchises(true)}
                onPointerDown={() => setLoadFranchises(true)}
                aria-busy={loadFranchises && franchises.isFetching}
                disabled={
                  gateway === null || (loadFranchises && franchises.isError)
                }
                className="h-12 w-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] px-3 text-sm text-[hsl(0,0%,94%)] outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold-accent)/0.2)] disabled:opacity-60"
              >
                <option value="">Todas as franquias</option>
                {franchise &&
                  !franchises.data?.items.some(
                    (item) => item.id === franchise,
                  ) && <option value={franchise}>{franchise}</option>}
                {franchises.data?.items.map((item) => (
                  <option key={item.category + "/" + item.id} value={item.id}>
                    {item.label} ({item.count})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="h-12 border border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent))] px-6 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[hsl(0,0%,5%)] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Buscar
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-end gap-3 border-b border-[hsl(0,0%,15%)] pb-6">
            <label className="min-w-[220px] flex-1 sm:max-w-sm">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[hsl(0,0%,56%)]">
                Encontrar franquia
              </span>
              <input
                value={franchiseDraft}
                onChange={(event) => setFranchiseDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    findFranchises();
                  }
                }}
                maxLength={80}
                placeholder="Digite ao menos 3 caracteres"
                aria-label="Pesquisar franquias"
                disabled={gateway === null}
                className="h-11 w-full border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] px-3 font-mono text-xs text-[hsl(0,0%,94%)] placeholder:text-[hsl(0,0%,42%)] focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))] disabled:opacity-60"
              />
            </label>
            <button
              type="button"
              onClick={findFranchises}
              disabled={
                gateway === null ||
                (franchiseDraft.trim().length > 0 &&
                  Array.from(franchiseDraft.trim()).length < 3)
              }
              className="h-11 border border-[hsl(var(--gold-accent)/0.5)] px-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] disabled:opacity-40"
            >
              Buscar franquias
            </button>
            {franchises.data?.truncated ? (
              <p
                className="max-w-xs text-xs text-[hsl(0,0%,56%)]"
                role="status"
              >
                A lista mostra apenas parte das franquias. Pesquise pelo nome
                para refinar.
              </p>
            ) : null}
            {franchises.isError ? (
              <p className="text-xs text-[hsl(0,0%,56%)]" role="alert">
                Não foi possível consultar as franquias.
              </p>
            ) : null}
          </div>

          {folder && !invalidFolderScope && (
            <div role="status" className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[hsl(var(--gold-accent))]">
              Pasta selecionada: {folder}
              <button type="button" onClick={() => changeParams(search, category, franchise, false)} className="border border-[hsl(var(--gold-accent)/0.5)] px-3 py-2">
                Limpar pasta
              </button>
            </div>
          )}

          <div className="mb-5 mt-10 flex flex-wrap items-end justify-between gap-3">
            <ArcadeSectionTitle>MODELOS DO ACERVO</ArcadeSectionTitle>
            <div className="flex flex-wrap items-center gap-3">
              {models.isSuccess && (
                <p className="text-sm text-[hsl(0,0%,56%)]" aria-live="polite">
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
                className="inline-flex min-h-11 items-center rounded-none border border-[hsl(var(--gold-accent))] px-4 text-sm font-semibold text-[hsl(var(--gold-accent))] hover:bg-[hsl(0,0%,9%)]"
              >
                Minha seleção ({selectedModels.length}/{MAX_CANONICAL_SELECTION}
                )
              </button>
            </div>
          </div>

          {gateway === null ? (
            <div
              role="status"
              className="rounded-none border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] p-8"
            >
              <h3 className="text-xl">Catálogo em integração</h3>
              <p className="mt-2 max-w-xl text-sm text-[hsl(0,0%,56%)]">
                A origem oficial do catálogo ainda não foi configurada neste
                ambiente. Nenhum modelo ou preço será apresentado como
                disponível sem essa validação.
              </p>
            </div>
          ) : invalidFolderScope ? (
            <p role="status" className="rounded-none bg-[hsl(0,0%,7%)] p-7 text-sm">
              A pasta requer uma categoria e uma franquia válidas.
            </p>
          ) : invalidSearch ? (
            <p
              role="status"
              className="rounded-none bg-[hsl(0,0%,7%)] p-7 text-sm"
            >
              Utilize ao menos três caracteres na pesquisa.
            </p>
          ) : models.isPending ? (
            <p
              role="status"
              className="rounded-none bg-[hsl(0,0%,7%)] p-7 text-sm"
            >
              Carregando os modelos publicados…
            </p>
          ) : models.isError ? (
            <div
              role="alert"
              className="rounded-none border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,7%)] p-7"
            >
              <h3 className="text-lg">Não foi possível consultar o acervo.</h3>
              <p className="mt-2 text-sm text-[hsl(0,0%,56%)]">
                Verifique a conexão e tente novamente. Não exibimos resultados
                antigos como se estivessem disponíveis.
              </p>
              <button
                type="button"
                onClick={() => void models.refetch()}
                className="mt-4 rounded-none border border-[hsl(var(--gold-accent))] px-4 py-2 text-sm"
              >
                Tentar novamente
              </button>
            </div>
          ) : rows.length === 0 ? (
            <p
              role="status"
              className="rounded-none bg-[hsl(0,0%,7%)] p-7 text-sm"
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
                  <ArcadeCard key={model.id} className="flex h-full flex-col">
                    <div className="flex h-full flex-col">
                      <Link
                        to={catalogModelDetailsPath(model.slug)}
                         state={{ catalogReturnSearch: searchParams.toString() }}
                        aria-label={"Ver detalhes de " + model.name}
                        className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                      >
                        <ModelCover
                          model={model}
                          mediaUrl={(key) => gateway.mediaUrl(key)}
                        />
                        <div className="space-y-1.5 p-3 md:p-4">
                          <p className="line-clamp-2 min-h-[2.5em] font-mono text-xs font-semibold uppercase tracking-[0.08em] leading-snug text-[hsl(0,0%,92%)] md:text-sm">
                            {model.name}
                          </p>
                          <p className="truncate text-xs text-[hsl(0,0%,56%)]">
                            {model.variantName || model.franchise}
                          </p>
                          <p className="text-xs text-[hsl(0,0%,56%)]">
                            {model.code}
                          </p>
                          <p className="pt-1 text-xs font-semibold text-[hsl(var(--gold-accent))]">
                            Ver detalhes
                          </p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleSelected(model)}
                        disabled={
                          !isSelected &&
                          selectedModels.length >= MAX_CANONICAL_SELECTION
                        }
                        aria-pressed={isSelected}
                        className="mx-3 mb-3 flex min-h-11 w-[calc(100%-1.5rem)] items-center justify-center rounded-none border border-[hsl(0,0%,15%)] px-2 text-xs font-medium transition-colors hover:border-[hsl(var(--gold-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isSelected
                          ? "Remover da seleção"
                          : "Adicionar à seleção"}
                      </button>
                    </div>
                  </ArcadeCard>
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
                  className="inline-flex h-11 items-center gap-2 rounded-none border border-[hsl(0,0%,15%)] px-4 text-sm disabled:opacity-40"
                >
                  <ArrowLeft size={16} aria-hidden="true" /> Anterior
                </button>
                <span className="text-sm text-[hsl(0,0%,56%)]">
                  {activePage.index + 1}
                </span>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!models.data.nextCursor}
                  className="inline-flex h-11 items-center gap-2 rounded-none border border-[hsl(0,0%,15%)] px-4 text-sm disabled:opacity-40"
                >
                  Próxima <ArrowRight size={16} aria-hidden="true" />
                </button>
              </nav>
            )}
        </div>
      </section>

      <Dialog open={selectionOpen} onOpenChange={setSelectionOpen}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto bg-[hsl(0,0%,7%)] text-[hsl(0,0%,94%)]">
          <DialogHeader>
            <DialogTitle>Minha seleção</DialogTitle>
            <DialogDescription>
              Modelos reunidos para preparar um orçamento, sem envio automático.
            </DialogDescription>
          </DialogHeader>
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-[hsl(0,0%,56%)]"
          >
            {selectedModels.length} de {MAX_CANONICAL_SELECTION} modelos
            selecionados.
          </p>
          {selectedModels.length === 0 ? (
            <p className="rounded-none bg-[hsl(0,0%,9%)] p-4 text-sm">
              Sua seleção está vazia. Escolha modelos no catálogo para começar.
            </p>
          ) : (
            <ul className="max-h-[50dvh] space-y-2 overflow-y-auto">
              {selectedModels.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-none border border-[hsl(0,0%,15%)] p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {item.name}
                    </p>
                    <p className="text-xs text-[hsl(0,0%,56%)]">{item.code}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSelected(item)}
                    aria-label={"Remover " + item.name + " da seleção"}
                    className="min-h-11 shrink-0 rounded-none border border-[hsl(0,0%,15%)] px-3 text-xs"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-[hsl(0,0%,15%)] pt-4 text-xs leading-relaxed text-[hsl(0,0%,56%)]">
            A seleção é temporária e permanece durante esta visita. A
            solicitação comercial será liberada depois da integração de preços,
            autenticação e pedidos com o Studio. Nenhum orçamento foi enviado.
          </p>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
