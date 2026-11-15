import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  GitCompareArrows,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Tags,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  addCatalogCurationTagAlias,
  ensureAdminInternalCollection,
  getInternalCollectionCurationPage,
  getInternalCollectionCurationSummary,
  INTERNAL_COLLECTION_TEMPLATES,
  listAdminInternalCollections,
  listCatalogCurationTags,
  saveCatalogModelClassifications,
  saveInternalCollectionCuration,
  verifyCatalogModelCharacterIdentity,
  type CatalogCurationState,
  type CatalogCurationTag,
  type CatalogCurationTagDimension,
} from "@/services/admin/catalog/admin-internal-collection-curation-service";
import {
  loadSubscriptionCatalogModels,
  searchSubscriptionCatalogModels,
  type SubscriptionCatalogModel,
} from "@/services/subscriptions/subscription-catalog-service";

const PAGE_SIZE = 20;
const COLLECTIONS_QUERY = ["admin-internal-catalog-collections"] as const;
const TAGS_QUERY = ["admin-catalog-curation-tags"] as const;

const stateLabels: Record<CatalogCurationState, string> = {
  suggested: "Sugerido",
  approved: "Aprovado na curadoria",
  selected_for_offer: "Selecionado para oferta · não publicado",
  discarded: "Descartado desta coleção",
};

const dimensionLabels: Record<CatalogCurationTagDimension, string> = {
  theme_genre: "Tema / gênero",
  characteristic: "Características",
  narrative_role: "Papel narrativo",
};

function modelLabel(model: {
  name: string;
  variantName: string;
}) {
  return model.variantName
    ? `${model.name} · ${model.variantName}`
    : model.name;
}

function modelRef(model: { id: string; slug: string }) {
  return { modelId: model.id, slug: model.slug };
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function InternalCollectionCuration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [collectionId, setCollectionId] = useState("");
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<CatalogCurationState | "all">(
    "all",
  );
  const [offset, setOffset] = useState(0);
  const [candidateIds, setCandidateIds] = useState<string[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [bulkState, setBulkState] =
    useState<CatalogCurationState>("suggested");
  const [tagId, setTagId] = useState("");
  const [tagReviewState, setTagReviewState] =
    useState<"suggested" | "approved">("suggested");
  const [aliasDraft, setAliasDraft] = useState("");

  const collectionsQuery = useQuery({
    queryKey: COLLECTIONS_QUERY,
    queryFn: listAdminInternalCollections,
  });
  const collections = collectionsQuery.data ?? [];
  const collection =
    collections.find((item) => item.id === collectionId) ??
    collections[0] ??
    null;

  useEffect(() => {
    if (collection && collection.id !== collectionId) {
      setCollectionId(collection.id);
    }
  }, [collection, collectionId]);

  useEffect(() => {
    setOffset(0);
    setMemberIds([]);
  }, [collection?.id, stateFilter]);

  useEffect(() => {
    setMemberIds([]);
  }, [offset]);

  const tagsQuery = useQuery({
    queryKey: TAGS_QUERY,
    queryFn: listCatalogCurationTags,
  });
  const tags = (tagsQuery.data ?? []).filter((tag) => tag.status === "active");

  useEffect(() => {
    if (!tagId && tags[0]) setTagId(tags[0].id);
  }, [tagId, tags]);

  const summaryQuery = useQuery({
    queryKey: ["admin-internal-catalog-summary", collection?.id],
    queryFn: () => getInternalCollectionCurationSummary(collection!.id),
    enabled: Boolean(collection),
  });

  const pageQuery = useQuery({
    queryKey: [
      "admin-internal-catalog-page",
      collection?.id,
      stateFilter,
      offset,
    ],
    queryFn: () =>
      getInternalCollectionCurationPage({
        collectionId: collection!.id,
        state: stateFilter,
        offset,
        limit: PAGE_SIZE,
      }),
    enabled: Boolean(collection),
  });
  const page = pageQuery.data;
  const pageSlugs = useMemo(
    () => page?.items.map((item) => item.slug) ?? [],
    [page?.items],
  );
  const pageModelsQuery = useQuery({
    queryKey: ["admin-internal-catalog-live-models", pageSlugs],
    queryFn: ({ signal }) => loadSubscriptionCatalogModels(pageSlugs, signal),
    enabled: pageSlugs.length > 0,
  });
  const liveModelsById = useMemo(
    () =>
      new Map(
        (pageModelsQuery.data ?? []).map((model) => [model.id, model] as const),
      ),
    [pageModelsQuery.data],
  );

  const searchQuery = useQuery({
    queryKey: ["admin-internal-catalog-search", search.trim()],
    queryFn: ({ signal }) =>
      searchSubscriptionCatalogModels(search.trim(), signal),
    enabled: Array.from(search.trim()).length >= 3,
    staleTime: 30_000,
  });
  const searchResults = searchQuery.data?.items ?? [];
  const searchModelsById = useMemo(
    () => new Map(searchResults.map((model) => [model.id, model] as const)),
    [searchResults],
  );

  const createCollection = useMutation({
    mutationFn: ensureAdminInternalCollection,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY });
      setCollectionId(created.id);
      toast({
        title: "Coleção interna preparada",
        description:
          "A coleção está privada e sem publicação comercial. Nenhum modelo foi associado automaticamente.",
      });
    },
    onError: (error) =>
      toast({
        title: "Não foi possível preparar a coleção",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      }),
  });

  const refreshCollection = async () => {
    if (!collection) return;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["admin-internal-catalog-page", collection.id],
      }),
      queryClient.invalidateQueries({
        queryKey: ["admin-internal-catalog-summary", collection.id],
      }),
    ]);
  };

  const candidateMutation = useMutation({
    mutationFn: async () => {
      if (!collection) throw new Error("Selecione uma coleção interna.");
      const models = candidateIds
        .map((id) => searchModelsById.get(id))
        .filter(isPresent);
      if (!models.length) throw new Error("Selecione candidatos do catálogo.");
      return saveInternalCollectionCuration({
        collectionId: collection.id,
        models: models.map(modelRef),
        state: "suggested",
        evidenceOrigin: "manual_admin:canonical_catalog_search",
        evidenceNote:
          "Candidato adicionado manualmente a partir de uma busca paginada no catálogo canônico.",
      });
    },
    onSuccess: async (count) => {
      setCandidateIds([]);
      await refreshCollection();
      toast({
        title: "Candidatos adicionados",
        description: `${count} modelo(s) registrado(s) como sugestão privada.`,
      });
    },
    onError: (error) =>
      toast({
        title: "Não foi possível adicionar os candidatos",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      }),
  });

  const stateMutation = useMutation({
    mutationFn: async () => {
      if (!collection || !page) throw new Error("Selecione uma coleção.");
      const selected = page.items.filter((item) =>
        memberIds.includes(item.modelId),
      );
      if (!selected.length) throw new Error("Selecione modelos da curadoria.");
      return saveInternalCollectionCuration({
        collectionId: collection.id,
        models: selected.map((item) => ({
          modelId: item.modelId,
          slug: item.slug,
        })),
        state: bulkState,
        evidenceOrigin: "manual_admin:curation_review",
        evidenceNote:
          bulkState === "selected_for_offer"
            ? "Seleção editorial para futura oferta. Não publica, não vende e não altera o checkout."
            : "Estado revisado manualmente na curadoria interna.",
      });
    },
    onSuccess: async (count) => {
      setMemberIds([]);
      await refreshCollection();
      toast({
        title: "Curadoria atualizada",
        description: `${count} modelo(s) atualizado(s). Nenhuma publicação comercial foi executada.`,
      });
    },
    onError: (error) =>
      toast({
        title: "Não foi possível atualizar a curadoria",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      }),
  });

  const tagMutation = useMutation({
    mutationFn: async () => {
      if (!page || !tagId) throw new Error("Selecione modelos e classificação.");
      const selected = page.items.filter((item) =>
        memberIds.includes(item.modelId),
      );
      if (!selected.length) throw new Error("Selecione modelos da curadoria.");
      return saveCatalogModelClassifications({
        models: selected.map((item) => ({
          modelId: item.modelId,
          slug: item.slug,
        })),
        tagId,
        reviewState: tagReviewState,
        evidenceOrigin: "manual_admin:controlled_classification",
        evidenceNote:
          "Classificação aplicada manualmente pelo vocabulário controlado da TONART.",
      });
    },
    onSuccess: async (count) => {
      await refreshCollection();
      toast({
        title: "Classificação atualizada",
        description: `${count} modelo(s) classificados com origem registrada.`,
      });
    },
    onError: (error) =>
      toast({
        title: "Não foi possível classificar os modelos",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      }),
  });

  const aliasMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTag) throw new Error("Selecione uma classificação.");
      return addCatalogCurationTagAlias({
        tagId: selectedTag.id,
        alias: aliasDraft,
      });
    },
    onSuccess: async (aliasSlug) => {
      setAliasDraft("");
      await queryClient.invalidateQueries({ queryKey: TAGS_QUERY });
      toast({
        title: "Sinônimo registrado",
        description: `${aliasSlug} agora resolve para a classificação selecionada.`,
      });
    },
    onError: (error) =>
      toast({
        title: "Não foi possível registrar o sinônimo",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      }),
  });

  const identityMutation = useMutation({
    mutationFn: async (model: SubscriptionCatalogModel) =>
      verifyCatalogModelCharacterIdentity({
        model: modelRef(model),
        characterName: model.name,
        franchise: model.franchise,
        evidenceOrigin: "manual_admin:canonical_catalog_identity",
        evidenceNote:
          "Identidade confirmada manualmente usando nome e franquia exibidos pelo catálogo canônico; a variante continua vinculada ao modelo.",
      }),
    onSuccess: async () => {
      await refreshCollection();
      toast({
        title: "Identidade verificada",
        description:
          "Esculturas com o mesmo nome de personagem e franquia verificados agora podem ser contadas como um personagem distinto.",
      });
    },
    onError: (error) =>
      toast({
        title: "Não foi possível verificar a identidade",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      }),
  });

  const selectedTag = tags.find((tag) => tag.id === tagId) ?? null;
  const compareModels = memberIds
    .slice(0, 4)
    .map((id) => liveModelsById.get(id))
    .filter(isPresent);

  const tagsByDimension = useMemo(() => {
    const grouped = new Map<CatalogCurationTagDimension, CatalogCurationTag[]>();
    tags.forEach((tag) => {
      grouped.set(tag.dimension, [...(grouped.get(tag.dimension) ?? []), tag]);
    });
    return grouped;
  }, [tags]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Curadoria interna de modelos</CardTitle>
            <CardDescription className="mt-2 max-w-4xl leading-6">
              Organize candidatos editoriais usando os mesmos IDs do catálogo.
              Esta área é privada: aprovar, classificar ou selecionar para oferta
              não publica a coleção, não altera preços e não autoriza direitos
              comerciais.
            </CardDescription>
          </div>
          <Badge variant="outline">Privado por padrão</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-7">
        <section className="space-y-3" aria-labelledby="curation-seeds-heading">
          <div>
            <h3 id="curation-seeds-heading" className="font-semibold">
              Coleções editoriais iniciais
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Preparar uma coleção cria ou reaproveita o mesmo registro de
              coleções. Nenhum personagem ou modelo é inventado ou associado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {INTERNAL_COLLECTION_TEMPLATES.map((template) => {
              const existing = collections.find(
                (item) => item.slug === template.slug,
              );
              return (
                <Button
                  key={template.slug}
                  type="button"
                  variant={existing ? "outline" : "secondary"}
                  disabled={createCollection.isPending}
                  onClick={() =>
                    existing
                      ? setCollectionId(existing.id)
                      : createCollection.mutate(template)
                  }
                >
                  {existing ? <Check className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {template.name}
                </Button>
              );
            })}
          </div>
        </section>

        {collectionsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Não foi possível carregar as coleções internas.
            </AlertDescription>
          </Alert>
        ) : collectionsQuery.isLoading ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando curadoria...
          </p>
        ) : collections.length === 0 ? (
          <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
            Nenhuma coleção interna foi preparada. Use uma das opções acima; isso
            não cria modelos nem publica ofertas.
          </p>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,2fr)]">
              <div className="space-y-2">
                <Label htmlFor="internal-curation-collection">Coleção interna</Label>
                <select
                  id="internal-curation-collection"
                  value={collection?.id ?? ""}
                  onChange={(event) => setCollectionId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                >
                  {collections.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.collectionKind === "hybrid" ? " · também comercial" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Modelos candidatos</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    {summaryQuery.data?.modelCount ?? "—"}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    Personagens distintos verificados
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    {summaryQuery.data?.distinctVerifiedCharacterCount ?? "—"}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    Modelos sem identidade verificada
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    {summaryQuery.data?.unverifiedModelCount ?? "—"}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3" aria-labelledby="candidate-search-heading">
              <div>
                <h3 id="candidate-search-heading" className="font-semibold">
                  Encontrar candidatos no catálogo
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  A busca consulta somente uma página do catálogo canônico; não
                  percorre o acervo inteiro.
                </p>
              </div>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  aria-label="Buscar candidatos no catálogo canônico"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setCandidateIds([]);
                  }}
                  placeholder="Personagem, franquia, código ou modelo..."
                  className="pl-9"
                />
              </div>
              {search.trim().length > 0 && search.trim().length < 3 && (
                <p className="text-sm text-muted-foreground">
                  Digite pelo menos 3 caracteres.
                </p>
              )}
              {searchQuery.isFetching && (
                <p role="status" className="text-sm text-muted-foreground">
                  Consultando uma página do catálogo...
                </p>
              )}
              {searchQuery.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    O catálogo canônico não respondeu. Nenhuma fonte alternativa
                    foi usada.
                  </AlertDescription>
                </Alert>
              )}
              {searchResults.length > 0 && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {searchResults.map((model) => {
                      const selected = candidateIds.includes(model.id);
                      return (
                        <button
                          key={model.id}
                          type="button"
                          aria-pressed={selected}
                          disabled={!selected && candidateIds.length >= 50}
                          onClick={() =>
                            setCandidateIds((current) =>
                              selected
                                ? current.filter((id) => id !== model.id)
                                : current.length >= 50
                                  ? current
                                  : [...current, model.id],
                            )
                          }
                          className="flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {model.imageUrl ? (
                            <img
                              src={model.imageUrl}
                              alt=""
                              className="h-14 w-14 shrink-0 rounded-md object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="h-14 w-14 shrink-0 rounded-md bg-muted" aria-hidden="true" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {modelLabel(model)}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {model.franchise} · {model.category}
                            </span>
                          </span>
                          <span className="shrink-0 text-primary" aria-hidden="true">
                            {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {candidateIds.length}/50 candidato(s) selecionado(s). Entram
                      como “Sugerido” com origem manual registrada.
                    </p>
                    <Button
                      type="button"
                      disabled={!candidateIds.length || candidateMutation.isPending}
                      onClick={() => candidateMutation.mutate()}
                    >
                      {candidateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Adicionar candidatos
                    </Button>
                  </div>
                </>
              )}
            </section>

            <section className="space-y-4" aria-labelledby="curation-list-heading">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 id="curation-list-heading" className="font-semibold">
                    Candidatos da coleção
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Estados editoriais são independentes da seleção comercial.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="internal-curation-state-filter">Filtrar estado</Label>
                  <select
                    id="internal-curation-state-filter"
                    value={stateFilter}
                    onChange={(event) =>
                      setStateFilter(
                        event.target.value as CatalogCurationState | "all",
                      )
                    }
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">Todos</option>
                    {(Object.keys(stateLabels) as CatalogCurationState[]).map(
                      (state) => (
                        <option key={state} value={state}>
                          {stateLabels[state]}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              {pageQuery.isLoading ? (
                <p role="status" className="text-sm text-muted-foreground">
                  Carregando candidatos...
                </p>
              ) : pageQuery.isError ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    Não foi possível carregar esta página da curadoria.
                  </AlertDescription>
                </Alert>
              ) : page && page.items.length === 0 ? (
                <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                  Nenhum candidato neste filtro.
                </p>
              ) : (
                <div className="space-y-3">
                  {page?.items.map((item) => {
                    const model = liveModelsById.get(item.modelId);
                    const selected = memberIds.includes(item.modelId);
                    return (
                      <article
                        key={item.modelId}
                        className="rounded-lg border p-4"
                      >
                        <div className="flex flex-wrap items-start gap-3">
                          <input
                            type="checkbox"
                            aria-label={`Selecionar ${model?.name ?? item.slug}`}
                            checked={selected}
                            onChange={() =>
                              setMemberIds((current) =>
                                selected
                                  ? current.filter((id) => id !== item.modelId)
                                  : [...current, item.modelId],
                              )
                            }
                            className="mt-1 h-4 w-4"
                          />
                          {model?.imageUrl ? (
                            <img
                              src={model.imageUrl}
                              alt=""
                              className="h-16 w-16 rounded-md object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="h-16 w-16 rounded-md bg-muted" aria-hidden="true" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-medium">
                                {model ? modelLabel(model) : item.slug}
                              </h4>
                              <Badge variant="outline">{stateLabels[item.state]}</Badge>
                              {item.identityVerified ? (
                                <Badge variant="secondary">
                                  <ShieldCheck className="mr-1 h-3 w-3" />
                                  Personagem verificado
                                </Badge>
                              ) : (
                                <Badge variant="outline">Identidade pendente</Badge>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {model
                                ? `${model.franchise} · ${model.category} · ${model.slug}`
                                : `Referência canônica: ${item.slug}`}
                            </p>
                            {item.tags.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {item.tags.map((tag) => (
                                  <Badge key={tag.id} variant="secondary">
                                    {dimensionLabels[tag.dimension]}: {tag.label}
                                    {tag.reviewState === "suggested" ? " · sugestão" : ""}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <p className="mt-3 text-xs text-muted-foreground">
                              Origem: {item.evidenceOrigin}
                              {item.evidenceNote ? ` · ${item.evidenceNote}` : ""}
                            </p>
                          </div>
                          {model && !item.identityVerified && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={identityMutation.isPending}
                              onClick={() => identityMutation.mutate(model)}
                            >
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              Confirmar personagem
                            </Button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {page && page.total > PAGE_SIZE && (
                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={offset === 0 || pageQuery.isFetching}
                    onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
                  >
                    Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {offset + 1}–{Math.min(offset + PAGE_SIZE, page.total)} de {page.total}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={offset + PAGE_SIZE >= page.total || pageQuery.isFetching}
                    onClick={() => setOffset((value) => value + PAGE_SIZE)}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </section>

            <section className="grid gap-5 border-t pt-6 xl:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <GitCompareArrows className="h-4 w-4" />
                  <h3 className="font-semibold">Comparar variantes</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Os quatro primeiros modelos selecionados aparecem lado a
                  lado; a ação em lote pode incluir toda a página. O personagem
                  só é agrupado depois da confirmação explícita da identidade.
                </p>
                {compareModels.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Selecione modelos acima para comparar.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {compareModels.map((model) => (
                      <div key={model.id} className="rounded-lg border p-3">
                        <p className="font-medium">{model.name}</p>
                        <p className="mt-1 text-sm">
                          Variante: {model.variantName || "Sem variante informada"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {model.franchise} · {model.slug}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Label htmlFor="internal-curation-bulk-state">
                    Estado dos modelos selecionados
                  </Label>
                  <select
                    id="internal-curation-bulk-state"
                    value={bulkState}
                    onChange={(event) =>
                      setBulkState(event.target.value as CatalogCurationState)
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {(Object.keys(stateLabels) as CatalogCurationState[]).map(
                      (state) => (
                        <option key={state} value={state}>
                          {stateLabels[state]}
                        </option>
                      ),
                    )}
                  </select>
                  <Button
                    type="button"
                    disabled={!memberIds.length || stateMutation.isPending}
                    onClick={() => stateMutation.mutate()}
                  >
                    {stateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Aplicar estado a {memberIds.length || 0} modelo(s)
                  </Button>
                  {bulkState === "selected_for_offer" && (
                    <p className="text-xs text-muted-foreground">
                      “Selecionado para oferta” é somente decisão editorial.
                      A seleção comercial existente continua separada e exige sua
                      própria aprovação.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  <h3 className="font-semibold">Classificação controlada</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tema/gênero, características e papel narrativo são dimensões
                  separadas. Não há campo de tags livres.
                </p>
                <div className="space-y-3">
                  {(
                    [
                      "theme_genre",
                      "characteristic",
                      "narrative_role",
                    ] as CatalogCurationTagDimension[]
                  ).map((dimension) => (
                    <div key={dimension}>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {dimensionLabels[dimension]}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(tagsByDimension.get(dimension) ?? []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            Nenhuma classificação definida.
                          </span>
                        ) : (
                          (tagsByDimension.get(dimension) ?? []).map((tag) => (
                            <Button
                              key={tag.id}
                              type="button"
                              size="sm"
                              variant={tag.id === tagId ? "default" : "outline"}
                              onClick={() => setTagId(tag.id)}
                            >
                              {tag.label}
                            </Button>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 pt-2">
                  <Label htmlFor="internal-curation-tag-state">
                    Revisão da classificação
                  </Label>
                  <select
                    id="internal-curation-tag-state"
                    value={tagReviewState}
                    onChange={(event) =>
                      setTagReviewState(
                        event.target.value as "suggested" | "approved",
                      )
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="suggested">Sugerida</option>
                    <option value="approved">Aprovada na curadoria</option>
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      !memberIds.length ||
                      !selectedTag ||
                      tagMutation.isPending
                    }
                    onClick={() => tagMutation.mutate()}
                  >
                    {tagMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Aplicar {selectedTag?.label ?? "classificação"} a {memberIds.length || 0}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    A classificação registra a origem da revisão. Ela não
                    presume licença, direito comercial ou elegibilidade de venda.
                  </p>
                </div>

                {selectedTag && (
                  <div className="rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">
                        Sinônimos de {selectedTag.label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Aliases só ajudam a reconhecer a mesma classificação.
                        Eles não criam uma nova tag e não são gerados
                        automaticamente.
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedTag.aliases.length ? (
                        selectedTag.aliases.map((alias) => (
                          <Badge key={alias} variant="secondary">
                            {alias}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Nenhum sinônimo registrado.
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Input
                        aria-label={`Novo sinônimo para ${selectedTag.label}`}
                        value={aliasDraft}
                        onChange={(event) => setAliasDraft(event.target.value)}
                        placeholder="Ex: horror classico"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!aliasDraft.trim() || aliasMutation.isPending}
                        onClick={() => aliasMutation.mutate()}
                      >
                        {aliasMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Adicionar sinônimo
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      O valor é normalizado para slug. Colisões com outra tag
                      são recusadas em vez de remapeadas.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <p className="border-t pt-5 text-xs text-muted-foreground">
              Catálogo: IDs, nome, franquia, categoria, variante e imagens
              continuam vindo do owner canônico. TONART persiste apenas relações
              editoriais, identidade verificada, estado e evidência.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
