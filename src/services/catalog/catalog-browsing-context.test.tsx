import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  CatalogBrowsingProvider,
  useCatalogBrowsing,
} from "./catalog-browsing-context";
import type { PublicCatalogModel } from "./public-catalog-gateway";

const KEY = "tonart:pending-quote-selection:v1";
const model: PublicCatalogModel = {
  id: "mdl_test_1",
  slug: "nier-10h-nier",
  code: "TONART-001",
  name: "Nier 10H",
  variantName: "",
  category: "Games",
  categorySlug: "games",
  franchise: "Nier",
  franchiseSlug: "nier",
  collection: null,
  folderPath: null,
  imageCount: 4,
  galleryVersion: 1,
  coverStorageKey: "media/mdl_test_1/img_1/card.webp",
};

function Probe() {
  const { selectedModels, setSelectedModels } = useCatalogBrowsing();
  return (
    <div>
      <span data-testid="selection">
        {selectedModels.map((item) => item.slug).join(",")}
      </span>
      <button type="button" onClick={() => setSelectedModels([model])}>
        selecionar
      </button>
      <button type="button" onClick={() => setSelectedModels([])}>
        limpar
      </button>
    </div>
  );
}

function mount() {
  return render(
    <CatalogBrowsingProvider>
      <Probe />
    </CatalogBrowsingProvider>,
  );
}

beforeEach(() => {
  vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "true");
  vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "false");
  vi.stubEnv("VITE_PREVIEW_READ_ONLY", "false");
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllEnvs();
});

describe("commercial catalog selection continuity", () => {
  it("restores a short-lived public model selection after a commercial reload", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        expiresAt: Date.now() + 60_000,
        items: [model],
      }),
    );
    mount();
    expect(screen.getByTestId("selection")).toHaveTextContent(model.slug);
  });

  it("persists selection and removes it when the quote flow clears the models", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "selecionar" }));
    await waitFor(() => expect(localStorage.getItem(KEY)).not.toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "limpar" }));
    await waitFor(() => expect(localStorage.getItem(KEY)).toBeNull());
  });

  it("rejects expired or malformed stored selections", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        expiresAt: Date.now() - 1,
        items: [model],
      }),
    );
    mount();
    expect(screen.getByTestId("selection")).toHaveTextContent("");
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("does not restore or write selection in the public read-only bundle", async () => {
    vi.stubEnv("VITE_TONECOS_COMMERCIAL_MVP", "false");
    vi.stubEnv("VITE_PUBLIC_CATALOG_MVP", "true");
    localStorage.setItem(
      KEY,
      JSON.stringify({
        expiresAt: Date.now() + 60_000,
        items: [model],
      }),
    );
    mount();
    expect(screen.getByTestId("selection")).toHaveTextContent("");

    fireEvent.click(screen.getByRole("button", { name: "selecionar" }));
    await waitFor(() =>
      expect(screen.getByTestId("selection")).toHaveTextContent(model.slug),
    );
    expect(JSON.parse(localStorage.getItem(KEY) ?? "{}").items).toEqual([model]);
  });
});
