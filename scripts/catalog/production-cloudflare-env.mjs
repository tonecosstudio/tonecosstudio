/**
 * Resolve the production Cloudflare account from the canonical M5 manifest.
 * Does not access, print, persist, or create authentication secrets.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const manifestPath = fileURLToPath(new URL("../../config/catalog-code-consolidation.json", import.meta.url));

function ensure(condition, reason) {
  if (!condition) throw new Error("m5_cloudflare_env_blocked:" + reason);
}

export function validateCloudflareProductionEnv(env, manifest) {
  ensure(env.GITHUB_ACTIONS === "true", "github_actions_only");
  ensure(env.GITHUB_REF === "refs/heads/main", "main_only");
  ensure(env.GITHUB_REPOSITORY === "tonecosstudio/tonecosstudio", "repository_mismatch");
  const accountId = manifest?.runtime?.cloudflareAccountId;
  ensure(typeof accountId === "string" && /^[a-f0-9]{32}$/.test(accountId), "canonical_account_id_invalid");
  const optionalVar = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  ensure(!optionalVar || optionalVar === accountId, "github_account_id_conflicts_with_manifest");
  ensure(typeof env.CLOUDFLARE_API_TOKEN === "string" && env.CLOUDFLARE_API_TOKEN.length > 10,
    "production_secret_CLOUDFLARE_API_TOKEN_missing");
  ensure(typeof env.GITHUB_ENV === "string" && env.GITHUB_ENV.length > 0, "github_env_file_missing");
  return { accountId };
}

export function writeCloudflareProductionEnv(env, manifest, append = appendFileSync) {
  const { accountId } = validateCloudflareProductionEnv(env, manifest);
  // Only the non-secret account identifier is written to GITHUB_ENV.
  append(env.GITHUB_ENV, "CLOUDFLARE_ACCOUNT_ID=" + accountId + "\n", { encoding: "utf8" });
  return { configured: true, accountIdFrom: "canonical_manifest", secretPresent: true };
}

const invoked = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    console.log(JSON.stringify(writeCloudflareProductionEnv(process.env, manifest)));
  } catch (error) {
    console.error("::error::" + String(error?.message ?? error));
    process.exitCode = 2;
  }
}
