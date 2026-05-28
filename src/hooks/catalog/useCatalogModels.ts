import { useQuery } from "@tanstack/react-query";
import { CATALOG_PAGE_SIZE } from "@/config/catalog";
import {
  listCatalogModels,
  type CatalogSort,
} from "@/services/catalog/catalog-models-service";

export type { CatalogSort };

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
        sort: filters.sort,
      },
    ],
    queryFn: () => listCatalogModels({ needle, page, filters }),
  });
}
