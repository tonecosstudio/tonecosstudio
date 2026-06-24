import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  classifyCurationImage,
  getCatalogCurationOverview,
  listCatalogImportBatches,
  listCatalogCollectionTargets,
  listCatalogCurationQueue,
  publishCurationItem,
  updateCurationItemStatus,
  type CatalogImportBatchesResult,
  type CatalogCurationOverview,
  type CatalogCurationItem,
  type CatalogCurationStatus,
  type CatalogMediaType,
  type CatalogPriceMode,
  type CatalogPublishInput,
  type CatalogVariantType,
  type CatalogVisibility,
} from "@/services/admin/catalog/catalog-curation-service";

export type {
  CatalogImportBatchesResult,
  CatalogCurationOverview,
  CatalogCurationItem,
  CatalogCurationStatus,
  CatalogMediaType,
  CatalogPriceMode,
  CatalogPublishInput,
  CatalogVariantType,
  CatalogVisibility,
};

const CATALOG_CURATION_QUEUE_QUERY_KEY = "admin-catalog-curation-queue";
const CATALOG_CURATION_OVERVIEW_QUERY_KEY = "admin-catalog-curation-overview";
const CATALOG_CURATION_COLLECTIONS_QUERY_KEY =
  "admin-catalog-curation-collections";
const CATALOG_IMPORT_BATCHES_QUERY_KEY = "admin-catalog-import-batches";
const MODELS_QUERY_KEY = "models";

export function useCatalogCurationQueue(status: string) {
  return useQuery({
    queryKey: [CATALOG_CURATION_QUEUE_QUERY_KEY, status],
    queryFn: () => listCatalogCurationQueue(status),
  });
}

export function useCatalogCurationOverview() {
  return useQuery({
    queryKey: [CATALOG_CURATION_OVERVIEW_QUERY_KEY],
    queryFn: getCatalogCurationOverview,
  });
}

export function useCatalogCurationCollections() {
  return useQuery({
    queryKey: [CATALOG_CURATION_COLLECTIONS_QUERY_KEY],
    queryFn: listCatalogCollectionTargets,
  });
}

export function useCatalogImportBatches() {
  return useQuery({
    queryKey: [CATALOG_IMPORT_BATCHES_QUERY_KEY],
    queryFn: listCatalogImportBatches,
  });
}

export function useClassifyCatalogCurationImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (queueId: string) => classifyCurationImage(queueId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CATALOG_CURATION_QUEUE_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [CATALOG_CURATION_OVERVIEW_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [CATALOG_IMPORT_BATCHES_QUERY_KEY],
      });
    },
  });
}

export function useUpdateCatalogCurationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      nextStatus,
    }: {
      id: string;
      nextStatus: CatalogCurationStatus;
    }) => updateCurationItemStatus(id, nextStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CATALOG_CURATION_QUEUE_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [CATALOG_CURATION_OVERVIEW_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [CATALOG_IMPORT_BATCHES_QUERY_KEY],
      });
    },
  });
}

export function usePublishCatalogCurationItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CatalogPublishInput) => publishCurationItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CATALOG_CURATION_QUEUE_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [CATALOG_CURATION_OVERVIEW_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [CATALOG_IMPORT_BATCHES_QUERY_KEY],
      });
      queryClient.invalidateQueries({ queryKey: [MODELS_QUERY_KEY] });
    },
  });
}
