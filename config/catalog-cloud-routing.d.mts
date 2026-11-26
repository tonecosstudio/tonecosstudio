export type CatalogCloud = "tonecos" | "ordax";
export const ACTIVE_CATALOG_CLOUD: CatalogCloud;
export const ACTIVE_CATALOG_ORIGIN: string;
export function resolveCatalogCloud(selection: unknown): Readonly<{cloud: CatalogCloud; origin: string}>;
export function checkCatalogBinding(active: CatalogCloud, configured: unknown): boolean;
export function assertImportCloud(active: CatalogCloud, configured: unknown): void;
export function receiptMatchesCloud(active: CatalogCloud, receipt: {catalogCloud?: unknown}): boolean;
export function assertCatalogCsp(csp: unknown, selection: CatalogCloud): void;
