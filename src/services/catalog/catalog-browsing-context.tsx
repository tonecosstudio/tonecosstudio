import {
  createContext, useContext, useState,
  type Dispatch, type ReactNode, type SetStateAction,
} from "react";
import type { PublicCatalogModel } from "./public-catalog-gateway";

/**
 * In-memory, per-visit browsing state for the public catalog.
 * No storage, pricing authority or order submission is involved.
 */
export type CatalogPagePosition = {
  scope: string;
  cursors: Array<string | undefined>;
  index: number;
};

type CatalogBrowsingState = {
  selectedModels: PublicCatalogModel[];
  setSelectedModels: Dispatch<SetStateAction<PublicCatalogModel[]>>;
  paging: CatalogPagePosition;
  setPaging: Dispatch<SetStateAction<CatalogPagePosition>>;
};

const CatalogBrowsingContext = createContext<CatalogBrowsingState | null>(null);

export function CatalogBrowsingProvider({ children }: { children: ReactNode }) {
  const [selectedModels, setSelectedModels] = useState<PublicCatalogModel[]>([]);
  const [paging, setPaging] = useState<CatalogPagePosition>({
    scope: "", cursors: [undefined], index: 0,
  });
  return (
    <CatalogBrowsingContext.Provider
      value={{ selectedModels, setSelectedModels, paging, setPaging }}
    >
      {children}
    </CatalogBrowsingContext.Provider>
  );
}

export function useCatalogBrowsing(): CatalogBrowsingState {
  const state = useContext(CatalogBrowsingContext);
  if (!state) throw new Error("catalog_browsing_provider_missing");
  return state;
}
