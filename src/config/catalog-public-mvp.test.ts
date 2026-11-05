import { afterEach, describe, expect, it, vi } from "vitest";
import { isCatalogPublicMvpEnabled, isCatalogMvpReadOnlyConfigurationSafe, isPublicCatalogMvpPath } from "./catalog-public-mvp";
afterEach(() => vi.unstubAllEnvs());
describe("Tonecos catalog MVP allowlist", () => {
  it.each(["/", "/landing", "/universo", "/universo/anime", "/universo/anime/nier",
    "/universo/anime/nier/2b", "/universo/personagem/legado", "/modelos", "/modelos/nier-10h-nier",
    "/sobre", "/contato", "/termos", "/privacidade", "/modelos/"])("accepts %s", p => expect(isPublicCatalogMvpPath(p)).toBe(true));
  it.each(["/login", "/admin", "/admin/users", "/perfil", "/orcamento", "/meus-orcamentos", "/moedas", "/recuperar-senha", "/admin/orcamentos", "/dashboard", "/wishlist",
    "/pedido/colecao/1/progresso", "/grupos", "/colecoes", "/selecionar-personagem",
    "/arcade-lab", "/migrar-pedido", "//evil.example", "/modelos/%2e%2e",
    "/modelos/../../admin", "/modelos/model/extra", "/universo/a/b/c/d",
    "/modelos/a%2fb", "/modelos/a?x=y"])("blocks %s", p => expect(isPublicCatalogMvpPath(p)).toBe(false));
  it("fails closed when read-only mode is absent", () => {
    vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "true");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
    expect(isCatalogPublicMvpEnabled()).toBe(true);
    expect(isCatalogMvpReadOnlyConfigurationSafe()).toBe(false);
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "true");
    expect(isCatalogMvpReadOnlyConfigurationSafe()).toBe(true);
  });
  it("does not change existing mode unless explicitly enabled", () => {
    vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
    vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
    expect(isCatalogPublicMvpEnabled()).toBe(false);
    expect(isCatalogMvpReadOnlyConfigurationSafe()).toBe(true);
  });
});
