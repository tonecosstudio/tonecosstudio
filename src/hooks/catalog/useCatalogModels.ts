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
    franchise: string;
    category: string;
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
        franchise: filters.franchise,
        category: filters.category,
        tagsCSV: filters.tagsCSV,
        sort: filters.sort,
      },
    ],
    queryFn: () => listCatalogModels({ needle, page, filters }),
  });
}
