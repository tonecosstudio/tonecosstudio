import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
    "index.html",
    "src/pages/LandingPage.tsx",
    "src/pages/CatalogArcade.tsx",
    "src/pages/CatalogModelsArcade.tsx",
    "src/components/arcade/ArcadeNav.tsx",
    "src/components/arcade/ArcadeFooter.tsx",
    "src/components/SEOHead.tsx",
  ];
  for (const sourcePath of entryPoints) {
    const content = readFileSync(resolve(process.cwd(), sourcePath), "utf8");
    expect(content, sourcePath).not.toMatch(/\bordax\b/i);
  }
});

it("routes model discovery to the canonical gateway and preserves shareable links", () => {
  const page = readFileSync(
    resolve(process.cwd(), "src/pages/CatalogModelsArcade.tsx"),
    "utf8",
  );
  const details = readFileSync(
    resolve(process.cwd(), "src/pages/catalog/CanonicalModelDetails.tsx"),
    "utf8",
  );
  const router = readFileSync(
    resolve(process.cwd(), "src/pages/catalog/ModelDetailsRoute.tsx"),
    "utf8",
  );
  expect(page).toContain("gateway!.listPage(");
  expect(page).toContain("catalogModelDetailsPath(model.slug)");
  expect(page).toContain("toggleCanonicalSelection(");
  expect(page).toContain("MAX_CANONICAL_SELECTION");
  expect(page).toContain("Nenhum orçamento foi enviado.");
  expect(page).not.toMatch(/useCatalogModels|UniverseModelCard|supabase|createQuote|submitQuote/);
  expect(details).toContain("gateway!.getModel(");
  expect(details).toContain("gateway!.listGallery(");
  expect(router).toContain("LEGACY_MODEL_ID");
  expect(router).toContain("CanonicalModelDetails");
  expect(router).toContain("LegacyModelDetails");
});
