import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BRAND_NAME, BRAND_SHORT_NAME, BRAND_STUDIO_LABEL } from "./brand";

describe("Tonecos public identity", () => {
  it("keeps one canonical consumer-facing name independent of the former OrdaX project", () => {
    expect(BRAND_NAME).toBe("TONART Studio");
    expect(BRAND_SHORT_NAME).toBe("TONART");
    expect(BRAND_STUDIO_LABEL).toBe("Studio");
    expect(BRAND_NAME).not.toMatch(/ordax/i);
  });
});

it("keeps public entry points free of the old OrdaX storefront identity", () => {
  const entryPoints = [
    "index.html",
    "src/pages/LandingPage.tsx",
    "src/pages/LoginArcade.tsx",
    "src/pages/TermsArcade.tsx",
    "src/pages/PrivacyArcade.tsx",
    "src/pages/ProfileArcade.tsx",
    "src/pages/NotificationsArcade.tsx",
    "src/pages/PaymentDetails.tsx",
    "src/pages/CustomerOrderProgressPage.tsx",
    "src/pages/GroupsArcade.tsx",
    "src/pages/MigratePedido.tsx",
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

it("keeps account entry points honest in read-only preview and signup journeys", () => {
  const login = readFileSync(
    resolve(process.cwd(), "src/pages/LoginArcade.tsx"),
    "utf8",
  );
  const nav = readFileSync(
    resolve(process.cwd(), "src/components/arcade/ArcadeNav.tsx"),
    "utf8",
  );
  const auth = readFileSync(
    resolve(process.cwd(), "src/services/auth/auth-session-service.ts"),
    "utf8",
  );
  expect(login).toContain('VITE_PREVIEW_READ_ONLY === "true"');
  expect(login).toContain("CONTAS EM PREPARAÇÃO");
  expect(login).toContain("emailConfirmationRequired");
  expect(login).not.toContain("Conta criada!");
  const navView = readFileSync(
    resolve(process.cwd(), "src/components/arcade/ArcadeNavView.tsx"), "utf8",
  );
  expect(navView).toContain("?mode=signup");
  expect(nav).toContain("ArcadeNavView");
  const contact = readFileSync(
    resolve(process.cwd(), "src/pages/ContactArcade.tsx"),
    "utf8",
  );
  expect(contact).toContain('VITE_PREVIEW_READ_ONLY === "true"');
  expect(contact).toContain("CONTATO EM PREPARAÇÃO");
  expect(auth).toContain("emailConfirmationRequired: !data.session");
});

it("keeps preview-only routes isolated from stale account sessions", () => {
  const auth = readFileSync(resolve(process.cwd(), "src/components/RequireAuth.tsx"), "utf8");
  const admin = readFileSync(resolve(process.cwd(), "src/components/RequireAdmin.tsx"), "utf8");
  const nav = readFileSync(resolve(process.cwd(), "src/components/arcade/ArcadeNav.tsx"), "utf8");
  const sync = readFileSync(resolve(process.cwd(), "src/hooks/useAuthProfileSync.ts"), "utf8");
  expect(auth).toContain("previewReadOnly");
  expect(admin).toContain("enabled: !previewReadOnly");
  expect(nav).toContain("visibleUser = PREVIEW_READ_ONLY ? null : user");
  expect(sync).toContain('VITE_PREVIEW_READ_ONLY === "true"');
});

it("keeps preview footer free of unavailable account and checkout promises", () => {
  const footer = readFileSync(resolve(process.cwd(), "src/components/arcade/ArcadeFooter.tsx"), "utf8");
  const footerView = readFileSync(
    resolve(process.cwd(), "src/components/arcade/ArcadeFooterView.tsx"), "utf8",
  );
  expect(footer).toContain('VITE_PREVIEW_READ_ONLY === "true"');
  expect(footerView).toContain("isCatalogPublicMvpEnabled()");
  expect(footer).toContain("enabled: !readOnly");
  expect(footer).not.toContain('label: "Pagamentos"');
  expect(footer).not.toContain('label: "Dashboard"');
  expect(footer).not.toContain('label: "Wishlist"');
});

it("uses only Tonecos visual assets for public pages and browser notifications", () => {
  const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
  const icon = readFileSync(resolve(process.cwd(), "public/favicon.svg"), "utf8");
  const fallback = readFileSync(resolve(process.cwd(), "public/image-fallback.svg"), "utf8");
  const constants = readFileSync(resolve(process.cwd(), "src/config/constants.ts"), "utf8");
  const alerts = readFileSync(
    resolve(process.cwd(), "src/services/notifications/alert-notification-service.ts"),
    "utf8",
  );
  expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />');
  expect(icon).toContain(">TONART Studio</title>");
  expect(icon).not.toMatch(/ordax|lovable/i);
  expect(fallback).toContain(">TONART</text>");
  expect(fallback).not.toMatch(/ordax/i);
  expect(constants).toContain('DEFAULT_ICON_URL: "/favicon.svg"');
  expect(alerts).toContain("icon: icon || ASSETS.DEFAULT_ICON_URL");
  expect(existsSync(resolve(process.cwd(), "public/favicon.ico"))).toBe(false);
  expect(existsSync(resolve(process.cwd(), "public/og-image.png"))).toBe(false);
});

it("keeps the npm package identity canonical across both manifests", () => {
  const pkg = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
  ) as { name: string };
  const lock = JSON.parse(
    readFileSync(resolve(process.cwd(), "package-lock.json"), "utf8"),
  ) as { name: string; packages: { "": { name: string } } };
  expect(pkg.name).toBe("tonecosstudio");
  expect(lock.name).toBe(pkg.name);
  expect(lock.packages[""].name).toBe(pkg.name);
});

it("does not expose obsolete Docker commands or the former OrdaX image name", () => {
  const manifest = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  const dockerCommands = Object.entries(manifest.scripts).filter(([name]) =>
    name.startsWith("docker:"),
  );
  expect(dockerCommands).toEqual([]);
  expect(JSON.stringify(manifest.scripts)).not.toContain("ordax-app:latest");
  expect(existsSync(resolve(process.cwd(), "Dockerfile"))).toBe(false);
  expect(existsSync(resolve(process.cwd(), "docker-compose.yml"))).toBe(false);
  expect(existsSync(resolve(process.cwd(), "docker-compose.dev.yml"))).toBe(false);
});

it("never bootstraps OrdaX Cloudflare resources from the Tonecos repo", () => {
  for (const path of [
    "scripts/cloudflare/bootstrap-cloudflare.mjs",
    "scripts/cloudflare/upload-r2-via-worker-route.mjs",
    "workers/ordax-catalog-assets.js",
  ]) {
    expect(existsSync(resolve(process.cwd(), path)), path).toBe(false);
  }
  for (const path of [".env.example", ".env.local.template"]) {
    const contents = readFileSync(resolve(process.cwd(), path), "utf8");
    expect(contents, path).not.toMatch(
      /^(?:VITE_CATALOG_ASSET_BASE_URL|CLOUDFLARE_ZONE_NAME|CLOUDFLARE_PAGES_PROJECT|CLOUDFLARE_PAGES_CUSTOM_DOMAIN|CLOUDFLARE_CATALOG_WORKER|CLOUDFLARE_CATALOG_ROUTE|CLOUDFLARE_R2_BUCKET)=.*ordax/im,
    );
  }
  const uploader = readFileSync(
    resolve(process.cwd(), "scripts/cloudflare/upload-catalog-webp-to-r2.mjs"),
    "utf8",
  );
  const planner = readFileSync(
    resolve(process.cwd(), "scripts/catalog/build-telegram-webp-db-import-plan.mjs"),
    "utf8",
  );
  expect(uploader).not.toContain('|| "ordax-catalog"');
  expect(planner).not.toContain('"https://ordax.com.br"');
});

it("builds a single deterministic social image from Tonecos-owned sources", () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
  ) as { scripts: { build: string } };
  const generator = readFileSync(
    resolve(process.cwd(), "scripts/branding/generate-og-image.mjs"),
    "utf8",
  );
  const seo = readFileSync(
    resolve(process.cwd(), "src/components/SEOHead.tsx"),
    "utf8",
  );
  const buildStages = packageJson.scripts.build.split(" && ");
  expect(buildStages[0]).toBe("node scripts/security/assert-catalog-mvp-build.mjs");
  const preflight = buildStages.find(stage => stage.includes("node --test")) ?? "";
  expect(preflight).toContain("node --test");
  expect(preflight).toContain("scripts/branding/generate-og-image.test.mjs");
  expect(preflight).toContain("scripts/cloudflare/catalog-pages-proxy.test.mjs");
  const bundleIndex = buildStages.indexOf("vite build");
  expect(bundleIndex).toBeGreaterThan(0);
  expect(buildStages.indexOf("node scripts/branding/generate-og-image.mjs")).toBeGreaterThan(
    bundleIndex,
  );
  expect(generator).toContain("dist/og-image.png");
  expect(generator).not.toContain("public/og-image.png");
  expect(generator).toContain("TONART STUDIO");
  expect(generator).toContain('xmlns="http://www.w3.org/2000/svg"');
  const svgMarkup = generator.split("const svg = `")[1]?.split("`;")[0] || "";
  expect(svgMarkup.replaceAll("http://www.w3.org/2000/svg", "")).not.toMatch(
    /ordax|fetch\(|https?:\/\//i,
  );
  expect(generator).not.toMatch(/fetch\(/i);
  expect(generator).toContain("dist/index.html");
  expect(generator).toContain("TONECOS_PUBLIC_ORIGIN");
  expect(seo).toContain('image = "/og-image.png"');
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
  expect(page).not.toMatch(
    /useCatalogModels|UniverseModelCard|supabase|createQuote|submitQuote/,
  );
  expect(details).toContain("gateway!.getModel(");
  expect(details).toContain("gateway!.listGallery(");
  expect(router).toContain('export { default } from "./CanonicalModelDetails"');
  expect(router).not.toMatch(/LEGACY_MODEL_ID|LegacyModelDetails|\.\/ModelDetails["']/);
  const historicalCharacter = readFileSync(
    resolve(process.cwd(), "src/pages/CatalogCharacterArcade.tsx"),
    "utf8",
  );
  expect(historicalCharacter).toContain("PUBLIC_ROUTES.catalogModels");
  expect(historicalCharacter).toContain("<Navigate");
  expect(historicalCharacter).not.toMatch(/ORDAX|listCatalogCharacterModels|catalog-models-service/);
});


it("uses Pages native SPA routing without a circular fallback rewrite", () => {
  // Cloudflare Pages serves index.html for missing SPA routes when no 404.html exists.
  // The old /* /index.html 200 rule was rejected as an infinite loop by Pages.
  const redirectsPath = resolve(process.cwd(), "public/_redirects");
  if (existsSync(redirectsPath)) {
    expect(readFileSync(redirectsPath, "utf8")).not.toMatch(
      /^\/\*\s+\/index\.html\s+200\s*$/m,
    );
  }
  expect(existsSync(resolve(process.cwd(), "public/404.html"))).toBe(false);
  expect(existsSync(resolve(process.cwd(), "functions/catalogo-api/[[path]].js"))).toBe(true);
});
