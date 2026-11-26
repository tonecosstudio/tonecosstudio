
import { createContext } from "react";

/** Public read-only builds receive the null default; no Auth runtime is imported. */
export type CatalogImageDriveResult = { saved: true; duplicate: boolean; folderName: string; count: number };
export type CatalogImageDriveAccess = {
  configured: boolean;
  save: (source: {path: string; modelSlug?: string}) => Promise<CatalogImageDriveResult>;
};
export const CatalogImageDriveContext = createContext<CatalogImageDriveAccess | null>(null);
