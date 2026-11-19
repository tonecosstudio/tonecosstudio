import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { injectSocialMeta, resolveSocialOrigin } from "./generate-og-image.mjs";

const html = '<!doctype html><head>\n    <meta property="og:site_name" content="TONART Studio" />\n</head>';

test("preview metadata uses only the Tonecos deployment host", () => {
  const origin = resolveSocialOrigin({
    VERCEL_ENV: "preview",
    VERCEL_URL: "tonecosstudio-hyku3xvwj-jogo-brasils-projects.vercel.app",
  });
  assert.equal(origin, "https://tonecosstudio-hyku3xvwj-jogo-brasils-projects.vercel.app");
  const result = injectSocialMeta(html, origin);
  const image = `${origin}/og-image.png`;
  assert.equal(result.match(/property="og:image"/g)?.length, 1);
  assert.equal(result.match(/name="twitter:image"/g)?.length, 1);
  assert.ok(result.includes(`<meta property="og:image" content="${image}" />`));
  assert.ok(result.includes(`<meta name="twitter:image" content="${image}" />`));
  assert.ok(result.includes('content="1200"'));
  assert.ok(result.includes('content="630"'));
});

test("official TONART Vercel preview uses only its own project hostname", () => {
  const origin = resolveSocialOrigin({
    VERCEL_ENV: "preview",
    VERCEL_URL: "tonart-studio-public-gsy7ngw7i-jogo-brasils-projects.vercel.app",
  });
  assert.equal(origin, "https://tonart-studio-public-gsy7ngw7i-jogo-brasils-projects.vercel.app");
});

test("dedicated TONART catalog preview has its own verified Vercel hostname", () => {
  const origin = resolveSocialOrigin({
    VERCEL_ENV: "preview",
    VERCEL_URL: "tonart-catalogo-publico-a1b2c3d4-jogo-brasils-projects.vercel.app",
  });
  assert.equal(origin, "https://tonart-catalogo-publico-a1b2c3d4-jogo-brasils-projects.vercel.app");
});

test("preview rejects a hostname from another project or a forged authority", () => {
  for (const host of [
    "ordax-three.vercel.app",
    "tonecosstudio.vercel.app.evil.test",
    "tonecosstudio-branch.vercel.app@evil.test",
    "",
  ]) {
    assert.throws(() => resolveSocialOrigin({ VERCEL_ENV: "preview", VERCEL_URL: host }));
  }
});

test("production fails closed until an explicit dedicated HTTPS hostname exists", () => {
  assert.throws(() => resolveSocialOrigin({ VERCEL_ENV: "production" }));
  for (const host of [
    "https://ordax.com.br",
    "https://www.ordax.com.br",
    "https://ordax-three.vercel.app",
    "http://tonecos.example",
    "https://tonecos.example/page",
    "https://tonecos.example?x=1",
  ]) {
    assert.throws(() => resolveSocialOrigin({ VERCEL_ENV: "production", TONECOS_PUBLIC_ORIGIN: host }));
  }
  assert.equal(
    resolveSocialOrigin({ VERCEL_ENV: "production", TONECOS_PUBLIC_ORIGIN: "https://tonecos.example" }),
    "https://tonecos.example",
  );
});

test("local builds skip server tags; duplicate or altered templates fail closed", () => {
  assert.equal(resolveSocialOrigin({}), null);
  assert.equal(injectSocialMeta(html, null), html);
  assert.throws(() => injectSocialMeta(html.replace("og:site_name", "og:type"), "https://tonecos.example"));
  const duplicated = `${html}\n<meta property="og:image" content="/old.png" />`;
  assert.throws(() => injectSocialMeta(duplicated, "https://tonecos.example"));
});

test("Cloudflare Pages preview generates absolute branded social URLs", () => {
  const origin = resolveSocialOrigin({
    CF_PAGES: "1",
    CF_PAGES_BRANCH: "integration/tonecosstudio-canonical-20261101",
    CF_PAGES_URL: "https://87422d7a.tonecosstudio.pages.dev",
  });
  assert.equal(origin, "https://87422d7a.tonecosstudio.pages.dev");
  const page = injectSocialMeta(html, origin);
  assert.ok(page.includes('content="https://87422d7a.tonecosstudio.pages.dev/og-image.png"'));
});

test("Cloudflare Pages preview rejects untrusted or malformed deployment URLs", () => {
  for (const url of [
    "", "https://tonecosstudio.pages.dev",
    "https://87422d7a.other.pages.dev",
    "http://87422d7a.tonecosstudio.pages.dev",
    "https://87422d7a.tonecosstudio.pages.dev.evil.test",
    "https://username@87422d7a.tonecosstudio.pages.dev",
    "https://87422d7a.tonecosstudio.pages.dev/path",
    "https://87422d7a.tonecosstudio.pages.dev/?debug=1",
  ]) {
    assert.throws(() => resolveSocialOrigin({
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "integration/tonecosstudio-canonical-20261101",
      CF_PAGES_URL: url,
    }), url);
  }
  assert.throws(() => resolveSocialOrigin({ CF_PAGES: "1", CF_PAGES_URL: "https://87422d7a.tonecosstudio.pages.dev" }));
});

test("Cloudflare Pages main requires explicit production origin", () => {
  assert.throws(() => resolveSocialOrigin({
    CF_PAGES: "1", CF_PAGES_BRANCH: "main",
    CF_PAGES_URL: "https://tonecosstudio.pages.dev",
  }));
  assert.equal(resolveSocialOrigin({
    CF_PAGES: "1", CF_PAGES_BRANCH: "main",
    CF_PAGES_URL: "https://tonecosstudio.pages.dev",
    TONECOS_PUBLIC_ORIGIN: "https://tonecos.example",
  }), "https://tonecos.example");
});

test("black and white TONART logos share the same scalable geometry", () => {
  const light = readFileSync(new URL("../../public/tonart-logo-white.svg", import.meta.url), "utf8");
  const dark = readFileSync(new URL("../../public/tonart-logo-black.svg", import.meta.url), "utf8");
  assert.match(light, /<title id="logo-title">TONART Studio<\/title>/);
  assert.match(dark, /<title id="logo-title">TONART Studio<\/title>/);
  assert.equal(light.replaceAll("#FFFFFF", "#111111").replaceAll("versão branca", "versão preta"), dark);
  assert.doesNotMatch(light + dark, /#(?:c99b45|c49a4e|b68b3b|f3cf78)/i);
});
