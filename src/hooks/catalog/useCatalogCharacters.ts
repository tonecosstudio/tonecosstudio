import { useQuery } from "@tanstack/react-query";
import { CATALOG_PAGE_SIZE } from "@/config/catalog";
import {
  listCatalogCharacters,
  type CatalogContentMode,
  type CatalogMode,
  type CatalogSort,
} from "@/services/catalog/catalog-models-service";

export type { CatalogContentMode, CatalogMode, CatalogSort };

export function useCatalogCharacters(
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
    contentMode?: CatalogContentMode;
    sort: CatalogSort;
  },
) {
  return useQuery({
    queryKey: [
      "catalog-characters",
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
        contentMode: filters.contentMode ?? "general",
        sort: filters.sort,
      },
    ],
    queryFn: () => listCatalogCharacters({ needle, page, filters }),
  });
}
