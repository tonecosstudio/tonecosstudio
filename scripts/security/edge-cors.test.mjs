import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

// Import the exact Edge CORS implementation; no fake parallel CORS rules.
const vars = new Map();
const previousDeno = globalThis.Deno;
globalThis.Deno = { env: { get: (key) => vars.get(key) } };
const { getCorsHeaders, handleOptions } = await import(
  "../../supabase/functions/_shared/cors.ts"
);

beforeEach(() => vars.clear());
after(() => {
  if (previousDeno === undefined) delete globalThis.Deno;
  else globalThis.Deno = previousDeno;
});

function request(origin, method = "OPTIONS") {
  const headers = {};
  if (origin !== undefined) headers.Origin = origin;
  return new Request("https://icmtmaakjucmuzxnofkd.supabase.co/functions/v1/admin-rpc", {
    method,
    headers,
  });
}

function allow(origin) {
  const response = handleOptions(request(origin));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(response.headers.get("Vary"), "Origin");
  assert.match(response.headers.get("Access-Control-Allow-Headers") ?? "", /authorization/);
  assert.match(response.headers.get("Access-Control-Allow-Methods") ?? "", /POST/);
}

function deny(origin) {
  const response = handleOptions(request(origin));
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
}

test("canonical production domain is allowed without a wildcard", () => {
  allow("https://tonartstudio.com.br");
});

test("canonical www domain is allowed", () => {
  allow("https://www.tonartstudio.com.br");
});

test("unknown and deceptive domains fail closed", () => {
  for (const origin of [
    "https://example.net",
    "https://tonartstudio.com.br.evil.example",
    "http://tonartstudio.com.br",
    "https://tonartstudio.com.br:444",
    "null",
  ]) deny(origin);
});

test("local development hosts are blocked without explicit opt-in", () => {
  deny("http://localhost:5173");
  deny("http://127.0.0.1:5173");
});

test("local development opt-in is exact, not a broad allowance", () => {
  vars.set("ALLOW_LOCAL_ORIGINS", "true");
  allow("http://localhost:5173");
  allow("http://127.0.0.1:5173");
  deny("http://localhost:5174");
});

test("a configured preview origin is allowed without relaxing other origins", () => {
  vars.set("ALLOWED_ORIGINS", "https://preview.tonartstudio.com.br");
  allow("https://preview.tonartstudio.com.br");
  deny("https://another-preview.tonartstudio.com.br");
});

test("SITE_URL remains the fallback only when ALLOWED_ORIGINS is unset", () => {
  vars.set("SITE_URL", "https://preview.tonartstudio.com.br");
  allow("https://preview.tonartstudio.com.br");
  vars.set("ALLOWED_ORIGINS", "https://staging.tonartstudio.com.br");
  deny("https://preview.tonartstudio.com.br");
  allow("https://staging.tonartstudio.com.br");
});

test("CORS preflight handler never intercepts actual POST requests", () => {
  assert.equal(handleOptions(request("https://tonartstudio.com.br", "POST")), null);
  assert.equal(
    getCorsHeaders(request("https://tonartstudio.com.br"))["Access-Control-Allow-Origin"],
    "https://tonartstudio.com.br",
  );
});
