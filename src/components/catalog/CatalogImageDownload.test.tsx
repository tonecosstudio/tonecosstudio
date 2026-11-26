import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  CatalogImageDownload,
  catalogDownloadFilename,
  catalogDownloadUrl,
} from "./CatalogImageDownload";

import { PromotionSelectionContext } from "./PromotionSelectionContext";

const src = "/catalogo-api/media/model/cover.webp";
const telegram =
  "/catalogo-api/api/telegram-studios/tg_" +
  "a".repeat(24) +
  "/media/" +
  "b".repeat(64) +
  "/display";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("catalog image download", () => {
  it("accepts only same-origin catalog media and preserves the format", () => {
    expect(catalogDownloadUrl(src)).toBe(window.location.origin + src);
    expect(catalogDownloadUrl(telegram)).toBe(
      window.location.origin + telegram,
    );
    expect(catalogDownloadUrl("https://example.org/media/a.webp")).toBeNull();
    expect(catalogDownloadUrl("/catalogo-api/api/admin/private")).toBeNull();
    expect(catalogDownloadUrl(telegram + "?token=test")).toBeNull();
    expect(
      catalogDownloadFilename("Homem-Aranha / edição", "mdl_123", "image/webp"),
    ).toBe("Homem-Aranha-edicao-mdl_123.webp");
  });

  it("is hidden when explicitly disabled or without a public source", () => {
    vi.stubEnv("VITE_CATALOG_IMAGE_DOWNLOAD_ENABLED", "false");
    const { rerender } = render(
      <CatalogImageDownload src={src} name="Modelo" id="123" />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    vi.stubEnv("VITE_CATALOG_IMAGE_DOWNLOAD_ENABLED", "true");
    rerender(<CatalogImageDownload src={null} name="Modelo" id="123" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it.each([src, telegram])(
    "downloads the authorized bytes only on click: %s",
    async (mediaUrl) => {
      vi.stubEnv("VITE_CATALOG_IMAGE_DOWNLOAD_ENABLED", "true");
      const blob = new Blob(["image"], { type: "image/webp" });
      const fetcher = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "image/webp" }),
        blob: async () => blob,
      });
      vi.stubGlobal("fetch", fetcher);
      const create = vi.fn(() => "blob:test");
      const revoke = vi.fn();
      const OriginalURL = window.URL;
      class MockURL extends OriginalURL {}
      Object.assign(MockURL, {
        createObjectURL: create,
        revokeObjectURL: revoke,
      });
      vi.stubGlobal("URL", MockURL);
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(function (this: HTMLAnchorElement) {
          expect(this.download).toBe("Modelo-123.webp");
        });
      render(<CatalogImageDownload src={mediaUrl} name="Modelo" id="123" />);
      expect(fetcher).not.toHaveBeenCalled();
      fireEvent.click(
        screen.getByRole("button", { name: "Baixar imagem de Modelo" }),
      );
      await waitFor(() => expect(click).toHaveBeenCalledOnce());
      expect(fetcher).toHaveBeenCalledWith(window.location.origin + mediaUrl, {
        cache: "no-store",
        redirect: "error",
        credentials: "omit",
      });
      expect(create).toHaveBeenCalledWith(blob);
    },
  );

  it.each([200, 403, 404])(
    "rejects HTML or refused media: HTTP %s",
    async (status) => {
      vi.stubEnv("VITE_CATALOG_IMAGE_DOWNLOAD_ENABLED", "true");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: status === 200,
          headers: new Headers({ "content-type": "text/html" }),
        }),
      );
      render(<CatalogImageDownload src={src} name="Modelo" id="123" />);
      fireEvent.click(
        screen.getByRole("button", { name: "Baixar imagem de Modelo" }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Não foi possível baixar",
      );
    },
  );
});

describe("promotion selection", () => {
  const label = "Adicionar à Black Friday";
  it("does not show the administrator action to a guest", () => {
    render(
      <CatalogImageDownload
        src={src}
        name="Modelo"
        id="123"
        modelSlug="modelo"
      />,
    );
    expect(screen.queryByRole("button", { name: label })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Baixar imagem de Modelo" }),
    ).toBeEnabled();
  });
  it.each([src, telegram])(
    "saves only the selected image and awaits the server receipt: %s",
    async (media) => {
      const save = vi.fn().mockResolvedValue(undefined);
      render(
        <PromotionSelectionContext.Provider value={{ save }}>
          <CatalogImageDownload
            src={media}
            name="Modelo"
            id="123"
            modelSlug={media === src ? "modelo" : undefined}
          />
        </PromotionSelectionContext.Provider>,
      );
      expect(save).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(
        await screen.findByRole("button", {
          name: "Adicionada à Black Friday",
        }),
      ).toBeDisabled();
      expect(save).toHaveBeenCalledWith({
        path: media.slice("/catalogo-api".length),
        modelSlug: media === src ? "modelo" : undefined,
      });
      expect(
        screen.getByRole("button", { name: "Baixar imagem de Modelo" }),
      ).toBeEnabled();
    },
  );
  it("never shows a saved state for an unsuccessful request", async () => {
    const save = vi.fn().mockRejectedValue(new Error("offline"));
    render(
      <PromotionSelectionContext.Provider value={{ save }}>
        <CatalogImageDownload src={telegram} name="Modelo" id="123" />
      </PromotionSelectionContext.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível confirmar",
    );
    expect(screen.getByRole("button", { name: label })).toBeEnabled();
  });
});
