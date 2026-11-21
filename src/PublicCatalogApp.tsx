/** Public catalog entry. Commercial modules must remain unreachable in this build. */
import TelegramStudioCatalog from "@/TelegramStudioCatalog";
import {
  isCatalogPublicMvpEnabled,
  isCatalogMvpReadOnlyConfigurationSafe,
} from "@/config/catalog-public-mvp";
import { isPreviewReadOnly } from "@/config/supabase-environment";

export default function PublicCatalogApp() {
  if (
    !isCatalogPublicMvpEnabled() ||
    !isCatalogMvpReadOnlyConfigurationSafe() ||
    !isPreviewReadOnly() ||
    import.meta.env.VITE_TONECOS_COMMERCIAL_MVP === "true"
  ) {
    throw new Error("MVP público exige configuração somente leitura.");
  }
  // This deployment is a standalone read-only catalog, not a commercial SPA.
  // Legacy routes may receive the static HTML fallback, but never mount account
  // or quote UI under the catalog hostname.
  if (
    typeof window !== "undefined" &&
    !["/", "/index.html"].includes(window.location.pathname)
  ) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#110e0c] px-5 text-center text-[#f1e9df]">
        <h1 className="text-3xl font-semibold">Página não encontrada</h1>
        <p className="max-w-md text-[#c2b5a7]">
          Este endereço contém somente o catálogo visual dos estúdios.
        </p>
        <a
          className="rounded-md border border-[#907351] px-5 py-3 text-[#f0d3ad] hover:bg-[#413023]"
          href="/"
        >
          Voltar ao catálogo
        </a>
      </main>
    );
  }
  return <TelegramStudioCatalog />;
}
