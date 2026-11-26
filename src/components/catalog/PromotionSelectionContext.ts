import { createContext } from "react";

import type { PromotionSource } from "@/types/promotion-selection";
export type { PromotionSource } from "@/types/promotion-selection";
export type PromotionSelectionAccess = { save: (source: PromotionSource) => Promise<void> };
export const PromotionSelectionContext = createContext<PromotionSelectionAccess | null>(null);
