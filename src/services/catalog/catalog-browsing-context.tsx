import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  validCatalogFolder,
  validCatalogSlug,
  type PublicCatalogModel,
} from "./public-catalog-gateway";
import { MAX_CANONICAL_SELECTION } from "./public-catalog-selection";

/**
 * Browsing state is in-memory by default. The commercial bundle may preserve
 * only a pending public-model selection for a short window so signup/email
 * confirmation or a same-browser tab reload does not break the quote journey.
 * No account data, prices, quantities or quote text is stored here.
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

type PersistedSelection = {
  expiresAt: number;
  items: PublicCatalogModel[];
};

const CatalogBrowsingContext = createContext<CatalogBrowsingState | null>(null);
const COMMERCIAL_SELECTION_STORAGE_KEY = "tonart:pending-quote-selection:v1";
const COMMERCIAL_SELECTION_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_PERSISTED_SELECTION_CHARS = 64 * 1024;

function commercialSelectionPersistenceEnabled(): boolean {
  return (
    import.meta.env.VITE_TONECOS_COMMERCIAL_MVP === "true" &&
    import.meta.env.VITE_PUBLIC_CATALOG_MVP !== "true" &&
    import.meta.env.VITE_PREVIEW_READ_ONLY !== "true"
  );
}

function boundedText(value: unknown, max = 512): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function optionalBoundedText(value: unknown, max = 512): value is string | null {
  return value === null || (typeof value === "string" && value.length <= max);
}

function isPersistableModel(value: unknown): value is PublicCatalogModel {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const model = value as Record<string, unknown>;
  return (
    boundedText(model.id) &&
    boundedText(model.slug, 240) &&
    validCatalogSlug(model.slug) &&
    boundedText(model.code) &&
    boundedText(model.name) &&
    typeof model.variantName === "string" &&
    model.variantName.length <= 512 &&
    boundedText(model.category) &&
    boundedText(model.categorySlug, 240) &&
    validCatalogSlug(model.categorySlug) &&
    boundedText(model.franchise) &&
    boundedText(model.franchiseSlug, 240) &&
    validCatalogSlug(model.franchiseSlug) &&
    optionalBoundedText(model.collection) &&
    optionalBoundedText(model.folderPath, 240) &&
    (model.folderPath === null || validCatalogFolder(model.folderPath)) &&
    Number.isSafeInteger(model.imageCount) &&
    (model.imageCount as number) >= 0 &&
    Number.isSafeInteger(model.galleryVersion) &&
    (model.galleryVersion as number) >= 0 &&
    (
      model.coverStorageKey === null ||
      (
        boundedText(model.coverStorageKey, 4096) &&
        model.coverStorageKey.startsWith("media/")
      )
    )
  );
}

function clearPersistedSelection(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(COMMERCIAL_SELECTION_STORAGE_KEY);
  } catch {
    // Storage is optional. The quote flow must keep working in memory.
  }
}

function loadPersistedSelection(): PublicCatalogModel[] {
  if (
    !commercialSelectionPersistenceEnabled() ||
    typeof window === "undefined"
  ) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(COMMERCIAL_SELECTION_STORAGE_KEY);
    if (!raw) return [];
    if (raw.length > MAX_PERSISTED_SELECTION_CHARS) {
      clearPersistedSelection();
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      clearPersistedSelection();
      return [];
    }

    const value = parsed as Partial<PersistedSelection>;
    const now = Date.now();
    if (
      typeof value.expiresAt !== "number" ||
      !Number.isSafeInteger(value.expiresAt) ||
      value.expiresAt <= now ||
      value.expiresAt > now + COMMERCIAL_SELECTION_TTL_MS + 60_000 ||
      !Array.isArray(value.items) ||
      value.items.length > MAX_CANONICAL_SELECTION ||
      !value.items.every(isPersistableModel)
    ) {
      clearPersistedSelection();
      return [];
    }

    const ids = new Set<string>();
    const slugs = new Set<string>();
    for (const item of value.items) {
      if (ids.has(item.id) || slugs.has(item.slug)) {
        clearPersistedSelection();
        return [];
      }
      ids.add(item.id);
      slugs.add(item.slug);
    }
    return value.items;
  } catch {
    clearPersistedSelection();
    return [];
  }
}

function persistSelection(items: readonly PublicCatalogModel[]): void {
  if (
    !commercialSelectionPersistenceEnabled() ||
    typeof window === "undefined"
  ) {
    return;
  }
  if (items.length === 0) {
    clearPersistedSelection();
    return;
  }
  if (
    items.length > MAX_CANONICAL_SELECTION ||
    !items.every(isPersistableModel)
  ) {
    clearPersistedSelection();
    return;
  }

  try {
    const raw = JSON.stringify({
      expiresAt: Date.now() + COMMERCIAL_SELECTION_TTL_MS,
      items,
    } satisfies PersistedSelection);
    if (raw.length > MAX_PERSISTED_SELECTION_CHARS) {
      clearPersistedSelection();
      return;
    }
    window.localStorage.setItem(COMMERCIAL_SELECTION_STORAGE_KEY, raw);
  } catch {
    // Storage is a continuity enhancement, never a requirement to quote.
  }
}

export function CatalogBrowsingProvider({ children }: { children: ReactNode }) {
  const [selectedModels, setSelectedModels] = useState<PublicCatalogModel[]>(
    loadPersistedSelection,
  );
  const [paging, setPaging] = useState<CatalogPagePosition>({
    scope: "",
    cursors: [undefined],
    index: 0,
  });
  const [universeReturnFocus, setUniverseReturnFocus] =
    useState<UniverseReturnFocus | null>(null);

  useEffect(() => {
    persistSelection(selectedModels);
  }, [selectedModels]);

  return (
    <CatalogBrowsingContext.Provider
      value={{
        selectedModels,
        setSelectedModels,
        paging,
        setPaging,
        universeReturnFocus,
        setUniverseReturnFocus,
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
