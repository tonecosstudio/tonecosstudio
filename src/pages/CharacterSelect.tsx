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
  const hasControlCharacter = Array.from(query).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  const validSearch = length >= 3 && length <= 80 && !hasControlCharacter;

  const destination = validSearch
    ? `${PUBLIC_ROUTES.catalogModels}?q=${encodeURIComponent(query)}`
    : PUBLIC_ROUTES.catalog;

  return <Navigate to={destination} replace />;
}
