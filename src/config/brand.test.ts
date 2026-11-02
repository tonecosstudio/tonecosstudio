import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BRAND_NAME, BRAND_SHORT_NAME, BRAND_STUDIO_LABEL } from "./brand";

describe("Tonecos public identity", () => {
  it("keeps one canonical consumer-facing name independent of the former OrdaX project", () => {
    expect(BRAND_NAME).toBe("Tonecos Studio");
    expect(BRAND_SHORT_NAME).toBe("Tonecos");
    expect(BRAND_STUDIO_LABEL).toBe("Studio");
    expect(BRAND_NAME).not.toMatch(/ordax/i);
  });
});

it("keeps public entry points free of the old OrdaX storefront identity", () => {
  const entryPoints = [
    "../../index.html",
    "../pages/LandingPage.tsx",
    "../pages/CatalogArcade.tsx",
    "../pages/CatalogModelsArcade.tsx",
    "../components/arcade/ArcadeNav.tsx",
    "../components/arcade/ArcadeFooter.tsx",
    "../components/SEOHead.tsx",
  ];
  for (const sourcePath of entryPoints) {
    const content = readFileSync(new URL(sourcePath, import.meta.url), "utf8");
    expect(content, sourcePath).not.toMatch(/\bordax\b/i);
  }
});

it("routes model discovery through the canonical catalog without Supabase fallback", () => {
  const page = readFileSync(
    new URL("../pages/CatalogModelsArcade.tsx", import.meta.url),
    "utf8",
  );
  expect(page).toContain("gateway!.listPage(");
  expect(page).toContain("gateway!.getModel(");
  expect(page).toContain("toggleCanonicalSelection(");
  expect(page).toContain("MAX_CANONICAL_SELECTION");
  expect(page).toContain("Nenhum orçamento foi enviado.");
  expect(page).not.toMatch(/useCatalogModels|UniverseModelCard|supabase|createQuote|submitQuote/);
});
