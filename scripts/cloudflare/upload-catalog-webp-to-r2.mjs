import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defaultTelegramWebpOutput } from "../catalog/telegram-paths.mjs";

loadEnv({ path: ".env.local", override: false, quiet: true });
loadEnv({ path: ".env", override: false, quiet: true });

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function argFlag(name) {
  return process.argv.includes(`--${name}`);
}

const WEBP_OUTPUT = path.resolve(
  argValue("output", process.env.ORDAX_WEBP_OUTPUT || defaultTelegramWebpOutput()),
);
const PLAN_PATH = path.resolve(
  argValue(
    "plan",
    path.join(
      WEBP_OUTPUT,
      "manifests",
      "site_import",
      "telegram_webp_storage_upload_plan.json",
    ),
  ),
);
const REPORT_PATH = path.resolve(
  argValue(
    "report",
    process.env.CLOUDFLARE_R2_UPLOAD_REPORT ||
      "tmp/cloudflare-r2-upload-report.json",
  ),
);
const EXECUTE = argFlag("execute") || process.env.CLOUDFLARE_R2_EXECUTE === "true";
const LIMIT = Number.parseInt(argValue("limit", ""), 10);
const ASSET_ROLE = argValue("asset-role", "all");
const ALLOW_OVERWRITE =
  argFlag("allow-overwrite") ||
  process.env.CLOUDFLARE_R2_ALLOW_OVERWRITE === "true";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const BUCKET = argValue(
  "bucket",
  process.env.CLOUDFLARE_R2_BUCKET || "ordax-catalog",
);
const ENDPOINT = (
  process.env.CLOUDFLARE_R2_ENDPOINT ||
  (ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : "")
).replace(/\/+$/, "");

function sha256Hex(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function hmac(key, value, encoding) {
  return crypto.createHmac("sha256", key).update(value).digest(encoding);
}

function encodePathSegment(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodeObjectKey(key) {
  return String(key || "")
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .map(encodePathSegment)
    .join("/");
}

function amzDates(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    amzDate: iso,
    shortDate: iso.slice(0, 8),
  };
}

function signingKey(shortDate) {
  const dateKey = hmac(`AWS4${SECRET_ACCESS_KEY}`, shortDate);
  const regionKey = hmac(dateKey, "auto");
  const serviceKey = hmac(regionKey, "s3");
  return hmac(serviceKey, "aws4_request");
}

function signedHeaders(method, key, bodyHash, extraHeaders = {}) {
  const { amzDate, shortDate } = amzDates();
  const endpointUrl = new URL(ENDPOINT);
  const objectPath = `/${BUCKET}/${encodeObjectKey(key)}`;
  const baseHeaders = {
    host: endpointUrl.host,
    "x-amz-content-sha256": bodyHash,
    "x-amz-date": amzDate,
    ...Object.fromEntries(
      Object.entries(extraHeaders).map(([header, value]) => [
        header.toLocaleLowerCase(),
        String(value).trim(),
      ]),
    ),
  };
  const signedHeaderNames = Object.keys(baseHeaders).sort();
  const canonicalHeaders = signedHeaderNames
    .map((header) => `${header}:${baseHeaders[header]}\n`)
    .join("");
  const canonicalRequest = [
    method,
    objectPath,
    "",
    canonicalHeaders,
    signedHeaderNames.join(";"),
    bodyHash,
  ].join("\n");
  const credentialScope = `${shortDate}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = hmac(signingKey(shortDate), stringToSign, "hex");

  return {
    url: `${ENDPOINT}${objectPath}`,
    headers: {
      ...baseHeaders,
      authorization: [
        `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY_ID}/${credentialScope}`,
        `SignedHeaders=${signedHeaderNames.join(";")}`,
        `Signature=${signature}`,
      ].join(", "),
    },
  };
}

async function headObject(key) {
  const emptyHash = sha256Hex("");
  const request = signedHeaders("HEAD", key, emptyHash);
  const response = await fetch(request.url, {
    method: "HEAD",
    headers: request.headers,
  });
  if (response.status === 404) return { exists: false };
  if (response.ok) {
    return {
      exists: true,
      bytes: Number(response.headers.get("content-length")) || null,
      etag: response.headers.get("etag"),
    };
  }
  return {
    exists: null,
    status: response.status,
    message: await response.text().catch(() => response.statusText),
  };
}

async function putObject(operation, bytes) {
  const bodyHash = sha256Hex(bytes);
  const request = signedHeaders("PUT", operation.storage_path, bodyHash, {
    "cache-control": operation.cache_control || "public, max-age=31536000, immutable",
    "content-type": operation.content_type || "image/webp",
  });
  const response = await fetch(request.url, {
    method: "PUT",
    headers: request.headers,
    body: bytes,
  });
  if (!response.ok) {
    throw new Error(
      `R2 upload failed (${response.status}) ${await response
        .text()
        .catch(() => response.statusText)}`,
    );
  }
}

function assertConfig() {
  if (!ENDPOINT || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET) {
    throw new Error(
      "Missing Cloudflare R2 config. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY and CLOUDFLARE_R2_BUCKET.",
    );
  }
}

async function loadOperations() {
  const plan = JSON.parse(await fs.readFile(PLAN_PATH, "utf8"));
  let operations = (plan.operations || []).filter(
    (operation) => operation.status === "ready_for_upload",
  );
  if (ASSET_ROLE !== "all") {
    operations = operations.filter(
      (operation) => operation.asset_role === ASSET_ROLE,
    );
  }
  if (Number.isFinite(LIMIT) && LIMIT > 0) {
    operations = operations.slice(0, LIMIT);
  }
  return operations;
}

async function inspectOperation(operation) {
  const bytes = await fs.readFile(operation.local_path);
  const actualBytes = bytes.byteLength;
  const actualHash = sha256Hex(bytes);
  const errors = [];
  if (Number(operation.expected_bytes) !== actualBytes) {
    errors.push("bytes_mismatch");
  }
  if (operation.sha256 && operation.sha256 !== actualHash) {
    errors.push("sha256_mismatch");
  }
  return { bytes, actualBytes, actualHash, errors };
}

async function writeReport(report) {
  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
}

async function main() {
  if (EXECUTE) assertConfig();

  const operations = await loadOperations();
  const report = {
    generated_at: new Date().toISOString(),
    execute: EXECUTE,
    allow_overwrite: ALLOW_OVERWRITE,
    bucket: BUCKET,
    endpoint: ENDPOINT || null,
    plan_path: PLAN_PATH,
    operations_total: operations.length,
    uploaded: 0,
    skipped_existing: 0,
    dry_run_ready: 0,
    failed: 0,
    failures: [],
  };

  for (const operation of operations) {
    try {
      const inspected = await inspectOperation(operation);
      if (inspected.errors.length) {
        throw new Error(inspected.errors.join(","));
      }

      if (!EXECUTE) {
        report.dry_run_ready += 1;
        continue;
      }

      if (!ALLOW_OVERWRITE) {
        const head = await headObject(operation.storage_path);
        if (head.exists === true) {
          report.skipped_existing += 1;
          continue;
        }
        if (head.exists === null) {
          throw new Error(`R2 HEAD failed (${head.status}) ${head.message}`);
        }
      }

      await putObject(operation, inspected.bytes);
      report.uploaded += 1;
    } catch (error) {
      report.failed += 1;
      report.failures.push({
        operation_id: operation.operation_id,
        storage_path: operation.storage_path,
        local_path: operation.local_path,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await writeReport(report);

  if (report.failed > 0) {
    throw new Error(
      `Cloudflare R2 upload finished with ${report.failed} failures. Report: ${REPORT_PATH}`,
    );
  }

  console.log(
    EXECUTE
      ? `Uploaded=${report.uploaded} skipped_existing=${report.skipped_existing} report=${REPORT_PATH}`
      : `Dry-run ready=${report.dry_run_ready} report=${REPORT_PATH}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
