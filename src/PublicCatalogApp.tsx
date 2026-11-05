/** Public catalog entry. Commercial modules must remain unreachable in this build. */
import { CatalogMvpShell } from "@/CatalogMvpShell";
import { isCatalogPublicMvpEnabled, isCatalogMvpReadOnlyConfigurationSafe } from "@/config/catalog-public-mvp";

export default function PublicCatalogApp() {
  if (!isCatalogPublicMvpEnabled() || !isCatalogMvpReadOnlyConfigurationSafe() ||
      import.meta.env.VITE_PREVIEW_READ_ONLY !== "true" ||
      import.meta.env.VITE_TONECOS_COMMERCIAL_MVP === "true") {
    throw new Error("MVP público exige configuração somente leitura.");
  }
  return <CatalogMvpShell />;
}
