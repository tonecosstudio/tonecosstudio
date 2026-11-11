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
  /** One-shot focus target for returning to a visited card. */
  returnFocusSlug?: string;
};

type UniverseReturnFocus = { path: string; slug: string };

type CatalogBrowsingState = {
  selectedModels: PublicCatalogModel[];
  setSelectedModels: Dispatch<SetStateAction<PublicCatalogModel[]>>;
  paging: CatalogPagePosition;
  setPaging: Dispatch<SetStateAction<CatalogPagePosition>>;
  /** One-shot visited card target for the currently verified Universe folder. */
  universeReturnFocus: UniverseReturnFocus | null;
  setUniverseReturnFocus: Dispatch<SetStateAction<UniverseReturnFocus | null>>;
};

const CatalogBrowsingContext = createContext<CatalogBrowsingState | null>(null);

export function CatalogBrowsingProvider({ children }: { children: ReactNode }) {
  const [selectedModels, setSelectedModels] = useState<PublicCatalogModel[]>([]);
  const [paging, setPaging] = useState<CatalogPagePosition>({
    scope: "", cursors: [undefined], index: 0,
  });
  const [universeReturnFocus, setUniverseReturnFocus] =
    useState<UniverseReturnFocus | null>(null);
  return (
    <CatalogBrowsingContext.Provider
      value={{
        selectedModels, setSelectedModels, paging, setPaging,
        universeReturnFocus, setUniverseReturnFocus,
      }}
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
