import { useMutation, useQuery } from "@tanstack/react-query";
import * as adminCreditCharactersService from "@/services/admin/choices/admin-credit-characters-service";

export const fetchCatalogCharacters = adminCreditCharactersService.fetchCatalogCharacters;
export const fetchPriceCategories = adminCreditCharactersService.fetchPriceCategories;
export const deleteCatalogCharacterById = adminCreditCharactersService.deleteCatalogCharacterById;
export const fetchUniqueThemeCategories = adminCreditCharactersService.fetchUniqueThemeCategories;
export const fetchUniqueProductLines = adminCreditCharactersService.fetchUniqueProductLines;
export const saveCatalogCharacter = adminCreditCharactersService.saveCatalogCharacter;
export const countCharactersByPriceCategory = adminCreditCharactersService.countCharactersByPriceCategory;
export const deletePriceCategory = adminCreditCharactersService.deletePriceCategory;
export const savePriceCategory = adminCreditCharactersService.savePriceCategory;

export function useAdminCreditCharactersData() {
  const charactersQuery = useQuery({
    queryKey: ["admin-catalog-characters"],
    queryFn: adminCreditCharactersService.fetchCatalogCharacters,
  });

  const categoriesQuery = useQuery({
    queryKey: ["admin-price-categories"],
    queryFn: adminCreditCharactersService.fetchPriceCategories,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await adminCreditCharactersService.deleteCatalogCharacterById(id);
    },
  });

  return {
    charactersQuery,
    categoriesQuery,
    deleteMutation,
  };
}
