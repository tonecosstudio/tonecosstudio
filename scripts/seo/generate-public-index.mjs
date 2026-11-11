/**
 * Cloudflare Pages release-gated robots/sitemap for the existing TONART SPA.
 * Does not query the catalog, D1, R2 or any remote network.
 */
import { readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

export const PUBLIC_STATIC_PATHS = Object.freeze([
  "/", "/universo", "/modelos", "/sobre", "/contato", "/termos", "/privacidade",
]);

export function resolveIndexingRelease(env = process.env) {
  const flag = (env.TONECOS_PUBLIC_INDEXING_RELEASE || "").trim();
  if (flag !== "" && flag !== "false" && flag !== "true") {
    throw new Error("Invalid public indexing release flag");
  }
  if (flag !== "true") return { enabled: false, origin: null };
  if (
    env.CF_PAGES !== "1" || env.CF_PAGES_BRANCH !== "main" ||
    env.VITE_PUBLIC_CATALOG_MVP !== "true" ||
    env.VITE_PREVIEW_READ_ONLY !== "true"
  ) {
    throw new Error("Indexing may only be released by approved readonly Pages main");
  }
  const raw = (env.TONECOS_PUBLIC_ORIGIN || "").trim();
  let url;
  try { url = new URL(raw); } catch {
    throw new Error("Missing or invalid explicit Tonecos production origin");
  }
  if (
    url.protocol !== "https:" || url.hostname !== "tonecosstudio.pages.dev" ||
    url.username || url.password || url.port || url.pathname !== "/" ||
    url.search || url.hash || raw !== url.origin
  ) {
    throw new Error("Indexing requires the verified dedicated Tonecos HTTPS origin");
  }
  return { enabled: true, origin: url.origin };
}

export function renderSitemap(origin) {
  return ['<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...PUBLIC_STATIC_PATHS.map(path => '  <url><loc>' + origin + path + '</loc></url>'),
    '</urlset>', ''].join("\n");
}

export function renderRobots(release) {
  return release.enabled
    ? 'User-agent: *\nAllow: /\nSitemap: ' + release.origin + '/sitemap.xml\n'
    : '# TONART Studio: staging/pre-release is not indexable.\nUser-agent: *\nDisallow: /\n';
}

export function applyIndexHold(html) {
  if (!html.includes("</head>")) throw new Error("Missing HTML head");
  const robots = /<meta\s+name=["']robots["'][^>]*>/i;
  const match = html.match(robots);
  if (match) {
    if (/content=["']noindex,nofollow["']/i.test(match[0])) return html;
    throw new Error("Unexpected existing robots meta");
  }
  return html.replace("</head>", '    <meta name="robots" content="noindex,nofollow" />\n  </head>');
}

export async function generatePublicIndex(env = process.env) {
  const release = resolveIndexingRelease(env);
  const dist = new URL("../../dist/", import.meta.url);
  const htmlFile = new URL("index.html", dist);
  const html = await readFile(htmlFile, "utf8");
  if (!release.enabled) await writeFile(htmlFile, applyIndexHold(html), "utf8");
  await writeFile(new URL("robots.txt", dist), renderRobots(release), "utf8");
  const sitemap = new URL("sitemap.xml", dist);
  if (release.enabled) await writeFile(sitemap, renderSitemap(release.origin), "utf8");
  else await rm(sitemap, { force: true });
  return release;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const release = await generatePublicIndex();
  console.log(release.enabled
    ? "Tonecos public SEO release: static routes indexed from explicit approved origin"
    : "Tonecos preview/pre-release: robots disallow, HTML noindex, no sitemap");
}
