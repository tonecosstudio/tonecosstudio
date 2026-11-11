import { Navigate } from "react-router-dom";
import { PUBLIC_ROUTES } from "@/config/routes";

/**
 * Historical character links cannot be resolved by the canonical Worker:
 * it has no character-only index. Send visitors to public model discovery
 * instead of inventing results or querying the superseded Supabase catalog.
 */
export default function CatalogCharacterArcade() {
  return <Navigate to={PUBLIC_ROUTES.catalogModels} replace />;
}
