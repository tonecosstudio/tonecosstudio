import { useQuery } from "@tanstack/react-query";
import { CATALOG_PAGE_SIZE } from "@/config/catalog";
import {
  listCatalogModels,
  type CatalogMode,
  type CatalogSort,
} from "@/services/catalog/catalog-models-service";

export type { CatalogMode, CatalogSort };

export function useCatalogModels(
  needle: string,
  page: number,
  filters: {
    character: string;
    franchise: string;
    category: string;
    sourceType: string;
    variantType: string;
    tagsCSV: string;
    catalogMode: CatalogMode;
    sort: CatalogSort;
  },
) {
  return useQuery({
    queryKey: [
      "models",
      {
        q: needle,
        page,
        pageSize: CATALOG_PAGE_SIZE,
        character: filters.character,
        franchise: filters.franchise,
        category: filters.category,
        sourceType: filters.sourceType,
        variantType: filters.variantType,
        tagsCSV: filters.tagsCSV,
        catalogMode: filters.catalogMode,
        sort: filters.sort,
      },
    ],
    queryFn: () => listCatalogModels({ needle, page, filters }),
  });
}
