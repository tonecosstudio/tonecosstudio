import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

// The white TONART logo SVG is the single source for the generated social image.
// Render offline at build time; never fetch catalog assets or user data.
const output = fileURLToPath(new URL("../../dist/og-image.png", import.meta.url));
const logoSource = fileURLToPath(new URL("../../public/tonart-logo-white.svg", import.meta.url));
export function resolveSocialOrigin(env = process.env) {
  if (env.CF_PAGES === "1") {
    const branch = (env.CF_PAGES_BRANCH || "").trim();
    if (!branch) {
      throw new Error("Cloudflare Pages requires a verified deployment branch.");
    }
    if (branch !== "main") {
      let url;
      try {
        url = new URL((env.CF_PAGES_URL || "").trim());
      } catch {
        throw new Error("Tonecos Pages preview requires a valid Pages URL.");
      }
      if (
        url.protocol !== "https:" || url.username || url.password ||
        url.port || url.pathname !== "/" || url.search || url.hash ||
        !/^[a-z0-9][a-z0-9-]*\.tonecosstudio\.pages\.dev$/.test(url.hostname)
      ) {
        throw new Error("Tonecos Pages preview requires its own HTTPS hostname.");
      }
      return url.origin;
    }
  }
  if (env.VERCEL_ENV === "preview") {
    const host = (env.VERCEL_URL || "").trim().toLowerCase();
    if (!/^(?:tonecosstudio|tonart-studio-public|tonart-catalogo-publico)-[a-z0-9-]+\.vercel\.app$/.test(host)) {
      throw new Error("Tonecos preview requires its own authenticated Vercel hostname.");
    }
    return `https://${host}`;
  }
  if (env.VERCEL_ENV === "production" || (env.CF_PAGES === "1" && env.CF_PAGES_BRANCH === "main")) {
    const raw = (env.TONECOS_PUBLIC_ORIGIN || "").trim();
    if (!raw) throw new Error("A verified Tonecos public origin is required for production social metadata.");
    let url;
    try {
      url = new URL(raw);
    } catch {
      throw new Error("Invalid Tonecos public origin.");
    }
    const host = url.hostname.toLowerCase();
    const legacyHost = host === "ordax.com.br" || host.endsWith(".ordax.com.br") || host === "ordax-three.vercel.app";
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash || legacyHost || host.endsWith(".vercel.app")) {
      throw new Error("A dedicated, HTTPS Tonecos hostname is required for production social metadata.");
    }
    return url.origin;
  }
  return null;
}

export function injectSocialMeta(html, origin, env = process.env) {
  if (!origin) return html;
  const socialAlt = env.VITE_PUBLIC_CATALOG_MVP === "true"
    ? "TONART Studio — catálogo visual dos modelos dos estúdios"
    : "TONART Studio — esculturas sob encomenda";
  const anchor = '    <meta property="og:site_name" content="TONART Studio" />';
  if (html.split(anchor).length !== 2 || html.includes('property="og:image"') || html.includes('name="twitter:image"')) {
    throw new Error("Unexpected Tonecos social metadata template; refusing to generate duplicates.");
  }
  const imageUrl = new URL("/og-image.png", origin).href;
  const tags = [
    `<meta property="og:image" content="${imageUrl}" />`,
    `<meta property="og:image:secure_url" content="${imageUrl}" />`,
    '<meta property="og:image:type" content="image/png" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${socialAlt}" />`,
    `<meta name="twitter:image" content="${imageUrl}" />`,
    `<meta name="twitter:image:alt" content="${socialAlt}" />`,
  ];
  return html.replace(anchor, `${anchor}\n    ${tags.join("\n    ")}`);
}

async function main() {
  const logo = await sharp(await readFile(logoSource))
    .resize({ width: 860 })
    .png()
    .toBuffer();
  await sharp({
    create: { width: 1200, height: 630, channels: 4, background: "#111111" },
  })
    .composite([{ input: logo, left: 170, top: 48 }])
    .png({ palette: true, compressionLevel: 9 })
    .toFile(output);
  const origin = resolveSocialOrigin();
  if (!origin) return;
  const indexPath = fileURLToPath(new URL("../../dist/index.html", import.meta.url));
  const html = await readFile(indexPath, "utf8");
  await writeFile(indexPath, injectSocialMeta(html, origin), "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

