/** Canonical read-only catalog MVP route policy (not a replacement for API/RLS). */
import { PUBLIC_ROUTES } from "./routes";
import { isPreviewReadOnly } from "./supabase-environment";
const PUBLIC = new Set<string>([
  PUBLIC_ROUTES.home,
  PUBLIC_ROUTES.landing,
  PUBLIC_ROUTES.catalog,
  PUBLIC_ROUTES.catalogModels,
  PUBLIC_ROUTES.catalogHub,
  PUBLIC_ROUTES.catalogHistorical,
  PUBLIC_ROUTES.catalogReview,
  PUBLIC_ROUTES.catalogReviewStudios,
  PUBLIC_ROUTES.catalogUnidentified,
  PUBLIC_ROUTES.catalogUnidentifiedStudios,
  PUBLIC_ROUTES.about,
  PUBLIC_ROUTES.contact,
  PUBLIC_ROUTES.terms,
  PUBLIC_ROUTES.privacy,
]);
const SLUG = /^[a-z0-9][a-z0-9-]{0,239}$/;
export function isCatalogPublicMvpEnabled(): boolean {
  return import.meta.env.VITE_PUBLIC_CATALOG_MVP === "true";
}
/** Legacy global media hold is retired. Only confirmed SpecialSTL models/paths are quarantined. */
export function isCatalogMediaUnderReview(): boolean {
  return false;
}
export function isCatalogMvpReadOnlyConfigurationSafe(): boolean {
  return !isCatalogPublicMvpEnabled() || isPreviewReadOnly();
}
export function isPublicCatalogMvpPath(path: string): boolean {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("?") ||
    path.includes("#") ||
    path.length > 1024
  )
    return false;
  const normalized =
    path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  if (PUBLIC.has(normalized)) return true;
  const parts = normalized.split("/").slice(1);
  if (parts[0] === "modelos" && parts.length === 2) return SLUG.test(parts[1]);
  if (parts[0] === "universo" && parts.length >= 2 && parts.length <= 4)
    return parts.slice(1).every((segment) => SLUG.test(segment));
  return false;
}
