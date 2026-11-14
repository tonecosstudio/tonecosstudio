import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus, RefreshCw, Search, X } from "lucide-react";
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
  listAdminSubscriptionCollections,
  saveAdminSubscriptionCollectionModels,
} from "@/services/admin/catalog/admin-subscription-collection-curation-service";
import {
  loadSubscriptionCatalogModels,
  searchSubscriptionCatalogModels,
} from "@/services/subscriptions/subscription-catalog-service";
import { MAX_CURATED_SUBSCRIPTION_MODELS } from "@/services/subscriptions/subscription-model-selection";

const QUERY_KEY = ["admin-subscription-collections"] as const;

function modelLabel(model: { name: string; variantName: string }) {
  return model.variantName
    ? `${model.name} · ${model.variantName}`
    : model.name;
}

export function SubscriptionCollectionCuration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const collectionsQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: listAdminSubscriptionCollections,
  });
  const collections = collectionsQuery.data ?? [];
  const [collectionId, setCollectionId] = useState("");
  const collection =
    collections.find((item) => item.id === collectionId) ??
    collections[0] ??
    null;
  const sourceSlugs = collection?.catalog_model_slugs ?? [];
  const sourceKey = `${collection?.id ?? ""}:${sourceSlugs.join("|")}`;
  const [modelSlugs, setModelSlugs] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setModelSlugs(sourceSlugs);
    // The string key tracks the persisted selection without depending on a new array instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  const selectedModelsQuery = useQuery({
    queryKey: [
      "admin-subscription-curated-models",
      collection?.id,
      sourceSlugs,
    ],
    queryFn: ({ signal }) => loadSubscriptionCatalogModels(sourceSlugs, signal),
    enabled: Boolean(collection && sourceSlugs.length > 0),
  });
  const searchQuery = useQuery({
    queryKey: ["admin-subscription-catalog-search", search.trim()],
    queryFn: ({ signal }) => searchSubscriptionCatalogModels(search, signal),
    enabled: Array.from(search.trim()).length >= 3,
    staleTime: 30_000,
  });
  const selectedBySlug = useMemo(
    () =>
      new Map(
        (selectedModelsQuery.data ?? []).map((model) => [model.slug, model]),
      ),
    [selectedModelsQuery.data],
  );
  const isDirty =
    modelSlugs.length !== sourceSlugs.length ||
    modelSlugs.some((slug, index) => slug !== sourceSlugs[index]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!collection) throw new Error("Selecione uma coleção.");
      return saveAdminSubscriptionCollectionModels({
        collectionId: collection.id,
        modelSlugs,
      });
    },
    onSuccess: async () => {
      toast({
        title: "Curadoria salva",
        description: `${collection?.name ?? "A coleção"} agora oferece ${modelSlugs.length} modelos para assinatura.`,
      });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error) =>
      toast({
        title: "Não foi possível salvar a curadoria",
        description:
          error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      }),
  });

  const toggleModel = (slug: string) => {
    setModelSlugs((current) => {
      if (current.includes(slug))
        return current.filter((item) => item !== slug);
      if (current.length >= MAX_CURATED_SUBSCRIPTION_MODELS) return current;
      return [...current, slug];
    });
  };

  const searchResults = searchQuery.data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Modelos disponíveis nas assinaturas</CardTitle>
            <CardDescription className="mt-2 max-w-3xl leading-6">
              Monte uma seleção própria para cada coleção. Aqui ficam somente as
              referências dos modelos publicados no catálogo; o cliente escolhe
              6 ou 12 deles conforme o plano.
            </CardDescription>
          </div>
          <Badge variant="outline">Catálogo D1</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {collectionsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              Não foi possível carregar as coleções para assinatura.
              <Button
                variant="outline"
                size="sm"
                onClick={() => void collectionsQuery.refetch()}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        ) : collectionsQuery.isLoading ? (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando coleções...
          </p>
        ) : collections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Crie uma coleção antes de preparar os modelos da assinatura.
          </p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="subscription-curation-collection">
                  Coleção
                </Label>
                <select
                  id="subscription-curation-collection"
                  value={collection?.id ?? ""}
                  onChange={(event) => setCollectionId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {collections.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.is_active ? "" : " (inativa)"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscription-catalog-search">
                  Buscar modelos publicados
                </Label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="subscription-catalog-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nome, variante ou franquia..."
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <section
              aria-labelledby="subscription-curated-heading"
              className="space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3
                    id="subscription-curated-heading"
                    className="font-semibold"
                  >
                    Seleção da coleção
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Até {MAX_CURATED_SUBSCRIPTION_MODELS} modelos por coleção;
                    os planos de 6 ou 12 exigem essa quantidade disponível.
                  </p>
                </div>
                <Badge
                  variant={modelSlugs.length >= 12 ? "default" : "secondary"}
                >
                  {modelSlugs.length}{" "}
                  {modelSlugs.length === 1 ? "modelo" : "modelos"}
                </Badge>
              </div>

              {modelSlugs.length === 0 ? (
                <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                  Nenhum modelo selecionado. Busque no catálogo e adicione os
                  modelos que podem entrar nesta assinatura.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {modelSlugs.map((slug) => {
                    const model = selectedBySlug.get(slug);
                    return (
                      <div
                        key={slug}
                        className="flex min-w-0 items-center gap-3 rounded-lg border p-3"
                      >
                        {model?.imageUrl ? (
                          <img
                            src={model.imageUrl}
                            alt=""
                            className="h-14 w-14 shrink-0 rounded-md object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="h-14 w-14 shrink-0 rounded-md bg-muted"
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {model ? modelLabel(model) : slug}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {model?.franchise ?? "Referência do catálogo"}
                          </span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remover ${model?.name ?? slug}`}
                          onClick={() => toggleModel(slug)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedModelsQuery.isError && sourceSlugs.length > 0 && (
                <p
                  role="status"
                  className="text-sm text-amber-700 dark:text-amber-300"
                >
                  Algumas referências não puderam ser carregadas do catálogo
                  atual. Remova as indisponíveis antes de ativar essa coleção.
                </p>
              )}
            </section>

            {search.trim().length > 0 && search.trim().length < 3 && (
              <p className="text-sm text-muted-foreground">
                Digite pelo menos 3 caracteres para buscar no catálogo.
              </p>
            )}
            {searchQuery.isFetching && (
              <p role="status" className="text-sm text-muted-foreground">
                Buscando no catálogo canônico...
              </p>
            )}
            {searchQuery.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Não foi possível consultar o catálogo. Revise a conexão e
                  tente novamente.
                </AlertDescription>
              </Alert>
            )}
            {searchResults.length > 0 && (
              <section
                aria-label="Resultados do catálogo"
                className="space-y-3"
              >
                <h3 className="font-semibold">Resultados</h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {searchResults.map((model) => {
                    const selected = modelSlugs.includes(model.slug);
                    const canAdd =
                      selected ||
                      modelSlugs.length < MAX_CURATED_SUBSCRIPTION_MODELS;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        aria-pressed={selected}
                        disabled={!canAdd}
                        onClick={() => toggleModel(model.slug)}
                        className="flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      >
                        {model.imageUrl ? (
                          <img
                            src={model.imageUrl}
                            alt=""
                            className="h-14 w-14 shrink-0 rounded-md object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="h-14 w-14 shrink-0 rounded-md bg-muted"
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {modelLabel(model)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {model.franchise}
                          </span>
                        </span>
                        <span
                          className="shrink-0 text-primary"
                          aria-hidden="true"
                        >
                          {selected ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </span>
                        <span className="sr-only">
                          {selected ? "Selecionado" : "Adicionar"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {searchQuery.isSuccess &&
              searchResults.length === 0 &&
              search.trim().length >= 3 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum modelo publicado corresponde a essa busca.
                </p>
              )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <p className="text-xs text-muted-foreground">
                A lista guarda somente slugs. Nome, imagem e detalhes continuam
                vindo do catálogo D1.
              </p>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!collection || !isDirty || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Salvar seleção
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
