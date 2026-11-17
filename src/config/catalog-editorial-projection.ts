/**
 * The public editorial profiles stay off until the canonical Worker exposes
 * the approved v1 projection. A matching environment flag alone is not enough:
 * the gateway also validates publication state, sources and relation evidence.
 */
export function isPublicEditorialProjectionEnabled(): boolean {
  return import.meta.env.VITE_TONECOS_PUBLIC_EDITORIAL_PROJECTION === "v1";
}
