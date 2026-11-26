import { createContext } from "react";

export type PromotionSource = { path: string; modelSlug?: string };
export type PromotionSelectionAccess = { save: (source: PromotionSource) => Promise<void> };
export const PromotionSelectionContext = createContext<PromotionSelectionAccess | null>(null);
