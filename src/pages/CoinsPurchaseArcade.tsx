import { Navigate } from "react-router-dom";
import { PUBLIC_ROUTES } from "@/config/routes";

/**
 * Legacy compatibility route.
 *
 * Coin purchases are not part of the active commercial surface because there is
 * no production payment integration for this flow. Keep old bookmarks safe by
 * redirecting to the published catalog instead of rendering a fake checkout.
 */
export default function CoinsPurchaseArcade() {
  return <Navigate to={PUBLIC_ROUTES.catalog} replace />;
}
