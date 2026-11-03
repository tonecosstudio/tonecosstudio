import { Navigate, useLocation } from "react-router-dom";
import { PUBLIC_ROUTES } from "@/config/routes";

/**
 * Compatibility route for the old public character directory.
 *
 * There is no authoritative character-only directory endpoint in the
 * canonical public Worker. Old URLs must not read the superseded
 * Supabase catalog, invent character counts, or silently mix sources.
 * Retain an eligible text search when moving to the canonical models.
 */
export default function CharacterSelect() {
  const { search } = useLocation();
  const query = (new URLSearchParams(search).get("q") ?? "").trim();
  const length = Array.from(query).length;
  const validSearch =
    length >= 3 &&
    length <= 80 &&
    !/[\u0000-\u001f\u007f]/.test(query);

  const destination = validSearch
    ? `${PUBLIC_ROUTES.catalogModels}?q=${encodeURIComponent(query)}`
    : PUBLIC_ROUTES.catalog;

  return <Navigate to={destination} replace />;
}
