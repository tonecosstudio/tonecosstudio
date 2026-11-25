import test from "node:test";
import assert from "node:assert/strict";
import { validateCloudflareProductionEnv, writeCloudflareProductionEnv } from "./production-cloudflare-env.mjs";

const accountId = "8827c547d6def5ee5b9ca550fdd5680a";
const manifest = { runtime: { cloudflareAccountId: accountId } };
const base = {
  GITHUB_ACTIONS: "true",
  GITHUB_REF: "refs/heads/main",
  GITHUB_REPOSITORY: "tonecosstudio/tonecosstudio",
  GITHUB_ENV: "/tmp/github-env-fixture",
  CLOUDFLARE_ACCOUNT_ID: "",
  CLOUDFLARE_API_TOKEN: "fake-token-for-tests-only",
};

test("M5 account comes from SSOT and only non-secret account ID is exported", () => {
  const writes = [];
  const result = writeCloudflareProductionEnv(base, manifest, (path, data, opts) => writes.push({ path, data, opts }));
  assert.deepEqual(result, { configured: true, accountIdFrom: "canonical_manifest", secretPresent: true });
  assert.deepEqual(writes.map(x => x.data), ["CLOUDFLARE_ACCOUNT_ID=" + accountId + "\n"]);
  assert.ok(writes.every(x => !x.data.includes(base.CLOUDFLARE_API_TOKEN)));
});

test("optional configured GitHub account ID must match canonical manifest", () => {
  assert.deepEqual(validateCloudflareProductionEnv({ ...base, CLOUDFLARE_ACCOUNT_ID: accountId }, manifest), { accountId });
  assert.throws(() => validateCloudflareProductionEnv({ ...base, CLOUDFLARE_ACCOUNT_ID: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }, manifest), /github_account_id_conflicts_with_manifest/);
});

test("absent production secret fails before any D1 or Worker operation", () => {
  let wrote = false;
  assert.throws(() => writeCloudflareProductionEnv({ ...base, CLOUDFLARE_API_TOKEN: "" }, manifest, () => { wrote = true; }), /production_secret_CLOUDFLARE_API_TOKEN_missing/);
  assert.equal(wrote, false);
});

test("unattested repository, branch and runtime fail closed", () => {
  for (const changed of [
    { GITHUB_ACTIONS: "false" },
    { GITHUB_REF: "refs/heads/feature" },
    { GITHUB_REPOSITORY: "some/other-repo" },
    { GITHUB_ENV: "" },
  ]) {
    assert.throws(() => validateCloudflareProductionEnv({ ...base, ...changed }, manifest));
  }
});

test("malformed or missing canonical Cloudflare account is never accepted", () => {
  for (const runtime of [{}, { cloudflareAccountId: "" }, { cloudflareAccountId: "../arbitrary" }]) {
    assert.throws(() => validateCloudflareProductionEnv(base, { runtime }), /canonical_account_id_invalid/);
  }
});
