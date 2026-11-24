import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CatalogImageDownload, catalogDownloadFilename, catalogDownloadUrl } from "./CatalogImageDownload";

const src = "/catalogo-api/media/model/cover.webp";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("catalog image download", () => {
  it("accepts only the same-origin catalog media route and preserves the format", () => {
    expect(catalogDownloadUrl(src)).toBe(window.location.origin + src);
    expect(catalogDownloadUrl("https://example.org/media/a.webp")).toBeNull();
    expect(catalogDownloadUrl("/catalogo-api/api/admin/private")).toBeNull();
    expect(catalogDownloadFilename("Homem-Aranha / edição", "mdl_123", "image/webp")).toBe("Homem-Aranha-edicao-mdl_123.webp");
  });
  it("is hidden when explicitly disabled", () => {
    vi.stubEnv("VITE_CATALOG_IMAGE_DOWNLOAD_ENABLED", "false");
    render(<CatalogImageDownload src={src} name="Modelo" id="123" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("downloads the authorized bytes only on click", async () => {
    vi.stubEnv("VITE_CATALOG_IMAGE_DOWNLOAD_ENABLED", "true");
    const blob = new Blob(["image"], {type:"image/webp"});
    const fetcher = vi.fn().mockResolvedValue({ok:true, headers:new Headers({"content-type":"image/webp"}), blob:async()=>blob});
    vi.stubGlobal("fetch", fetcher);
    const create = vi.fn(() => "blob:test");
    const revoke = vi.fn();
    const orig = window.URL;
    class MockURL extends orig {}
    Object.assign(MockURL, {createObjectURL:create,revokeObjectURL:revoke});
    vi.stubGlobal("URL", MockURL);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function(this: HTMLAnchorElement) {
      expect(this.download).toBe("Modelo-123.webp");
    });
    render(<CatalogImageDownload src={src} name="Modelo" id="123" />);
    expect(fetcher).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name:"Baixar imagem de Modelo"}));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(create).toHaveBeenCalledWith(blob);
  });
  it("rejects non-image responses", async () => {
    vi.stubEnv("VITE_CATALOG_IMAGE_DOWNLOAD_ENABLED", "true");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok:true, headers:new Headers({"content-type":"text/html"})}));
    render(<CatalogImageDownload src={src} name="Modelo" id="123" />);
    fireEvent.click(screen.getByRole("button", {name:"Baixar imagem de Modelo"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível baixar");
  });
});
