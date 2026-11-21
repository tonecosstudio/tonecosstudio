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
const PRIVATE_STUDIOS = argFlag("private-telegram-studios");
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
  process.env.CLOUDFLARE_R2_BUCKET || (PRIVATE_STUDIOS ? "tonecos-catalogo-staging" : ""),
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
      optimized_sha256: response.headers.get("x-amz-meta-optimized-sha256"),
      original_sha256: response.headers.get("x-amz-meta-original-sha256"),
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
    "cache-control": PRIVATE_STUDIOS ? "private, no-store" : (operation.cache_control || "public, max-age=31536000, immutable"),
    "content-type": operation.content_type || "image/webp",
    ...(PRIVATE_STUDIOS ? {
      "x-amz-meta-original-sha256": operation.original_sha256,
      "x-amz-meta-optimized-sha256": bodyHash,
      "x-amz-meta-telegram-origin": operation.telegram_origin_id,
      "x-amz-meta-profile-version": operation.profile_version,
      "x-amz-meta-derivation": operation.asset_role,
    } : {}),
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
  if (PRIVATE_STUDIOS && (BUCKET !== "tonecos-catalogo-staging" || ALLOW_OVERWRITE)) {
    throw new Error("Private Telegram R2 uploads must use the staging bucket without overwrite.");
  }
  if (/^ordax(?:-|$)/i.test(BUCKET)) {
    throw new Error("OrdaX R2 buckets are not authorized for Tonecos Studio.");
  }
  if (!ENDPOINT || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET) {
    throw new Error(
      "Missing Cloudflare R2 config. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY and CLOUDFLARE_R2_BUCKET.",
    );
  }
}

async function loadOperations() {
  const plan = JSON.parse(await fs.readFile(PLAN_PATH, "utf8"));
  if (PRIVATE_STUDIOS && (plan.mode !== "private_telegram_studios" ||
      plan.storage_bucket !== "tonecos-catalogo-staging" ||
      plan.namespace !== "telegram-studios/v1")) {
    throw new Error("Private Telegram R2 plan has an invalid storage contract.");
  }
  let operations = (plan.operations || []).filter(
    (operation) => operation.status === "ready_for_upload",
  );
  if (PRIVATE_STUDIOS) {
    for (const item of operations) {
      const m = /^telegram-studios\/v1\/([0-9]+)\/([a-z0-9_-]+)\/([a-f0-9]{2})\/([a-f0-9]{64})\/(display|thumb)\.webp$/i.exec(item.storage_path || "");
      if (!m || m[1] !== String(item.telegram_origin_id) ||
          m[2] !== item.profile_version || m[3] !== item.original_sha256.slice(0,2) ||
          m[4] !== item.original_sha256 || m[5] !== item.asset_role ||
          item.private_staging_only !== true || item.storage_bucket !== BUCKET ||
          !/^[a-f0-9]{64}$/.test(String(item.sha256 || "")) ||
          !Number.isSafeInteger(item.expected_bytes) || item.expected_bytes <= 0 ||
          !Array.isArray(item.message_ids) || item.message_ids.length === 0 ||
          typeof item.evidence_ref !== "string" || !item.evidence_ref.trim()) {
        throw new Error("Private Telegram operation lacks verified storage authorization.");
      }
    }
  }
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
  if (PRIVATE_STUDIOS && (bytes.length < 12 ||
      bytes.toString("ascii", 0, 4) !== "RIFF" ||
      bytes.toString("ascii", 8, 12) !== "WEBP")) {
    errors.push("invalid_webp_magic");
  }
  return { bytes, actualBytes, actualHash, errors };
}

async function writeReport(report) {
  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
}

async function privateAtomicJournal(file, journal) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(journal, null, 2) + "\n", "utf8");
  await fs.rename(tmp, file);
}

function assertPrivateHead(head, op) {
  if (!head.exists || head.bytes !== op.expected_bytes ||
      head.optimized_sha256 !== op.sha256 ||
      head.original_sha256 !== op.original_sha256) {
    throw new Error("R2 object collision or SHA-256 mismatch: " + op.storage_path);
  }
}

function isTransientR2Error(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /(?:R2 (?:upload|HEAD|GET) (?:failed )?\((?:429|5\d\d)\)|(?:fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|UND_ERR_CONNECT_TIMEOUT))/i.test(message);
}

async function privateOne(op) {
  const local = await inspectOperation(op);
  if (local.errors.length) throw new Error(local.errors.join(","));
  if (!EXECUTE) return { status: "dry_run", bytes: 0 };
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      // HEAD before every retry prevents repeating a PUT that actually succeeded
      // before a 429/5xx or a lost response.
      const before = await headObject(op.storage_path);
      if (before.exists === null) throw new Error("R2 HEAD failed (" + before.status + ")");
      if (before.exists === true) {
        assertPrivateHead(before, op);
        return { status: "reused", bytes: 0 };
      }
      await putObject(op, local.bytes);
      const after = await headObject(op.storage_path);
      assertPrivateHead(after, op);
      return { status: "uploaded", bytes: local.actualBytes };
    } catch (error) {
      if (attempt === 4 || !isTransientR2Error(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
    }
  }
  throw new Error("R2 retry attempts exhausted");
}

async function privateFullGet(op) {
  const req = signedHeaders("GET", op.storage_path, sha256Hex(""));
  const response = await fetch(req.url, { method: "GET", headers: req.headers });
  if (!response.ok) throw new Error("R2 GET failed (" + response.status + ")");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== op.expected_bytes || sha256Hex(bytes) !== op.sha256) {
    throw new Error("R2 GET SHA-256 mismatch for " + op.operation_id);
  }
}

async function mainPrivate() {
  if (BUCKET !== "tonecos-catalogo-staging" || ALLOW_OVERWRITE) {
    throw new Error("Private Telegram upload cannot overwrite or target public R2.");
  }
  if (EXECUTE) assertConfig();
  const operations = await loadOperations();
  const checkpoint = path.resolve(argValue("checkpoint",
    path.join(path.dirname(PLAN_PATH), "telegram_studios_r2_checkpoint.json")));
  const report = {
    mode: "private_telegram_studios", bucket: BUCKET, namespace: "telegram-studios/v1",
    plan_path: PLAN_PATH, checkpoint_path: checkpoint, execute: EXECUTE,
    eligible: operations.length, uploaded: 0, reused: 0, bytes_transferred: 0,
    remote_head_verified: 0, remote_full_sha_verified: 0,
    dry_run_ready: 0, pending: operations.length, failed: 0, failures: [],
    public_upload_performed: false,
  };
  let journal = { mode: report.mode, plan_path: PLAN_PATH, objects: {} };
  try {
    const old = JSON.parse(await fs.readFile(checkpoint, "utf8"));
    if (old.mode === report.mode && old.plan_path === PLAN_PATH) journal = old;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const resume = argFlag("resume-checkpoint");
  const verifiedInCheckpoint = (op) => {
    const entry = journal.objects[op.storage_path];
    return entry && (entry.status === "uploaded" || entry.status === "reused") &&
      entry.sha256 === op.sha256 && entry.bytes === op.expected_bytes &&
      entry.original_sha256 === op.original_sha256;
  };
  const pendingOperations = resume
    ? operations.filter((op) => !verifiedInCheckpoint(op))
    : operations;
  report.checkpoint_verified = operations.length - pendingOperations.length;
  report.pending = pendingOperations.length;
  const confirmed = [];
  const concurrency = Math.max(1, Math.min(8, Number(argValue("concurrency", "6")) || 6));
  for (let pos = 0; pos < pendingOperations.length; pos += concurrency) {
    const batch = pendingOperations.slice(pos, pos + concurrency);
    const result = await Promise.all(batch.map(async (op) => {
      try { return { op, outcome: await privateOne(op) }; }
      catch (e) { return { op, error: e instanceof Error ? e.message : String(e) }; }
    }));
    for (const item of result) {
      if (item.error) {
        report.failed++;
        report.failures.push({ operation_id: item.op.operation_id,
          storage_path: item.op.storage_path, message: item.error });
      } else if (item.outcome.status === "dry_run") {
        report.dry_run_ready++;
      } else {
        if (item.outcome.status === "uploaded") report.uploaded++;
        else report.reused++;
        report.bytes_transferred += item.outcome.bytes;
        report.remote_head_verified++;
        confirmed.push(item.op);
        journal.objects[item.op.storage_path] = {
          sha256: item.op.sha256, bytes: item.op.expected_bytes,
          original_sha256: item.op.original_sha256, status: item.outcome.status,
        };
      }
    }
    report.pending = pendingOperations.length - pos - batch.length;
    if (EXECUTE) {
      journal.updated_at = new Date().toISOString();
      await privateAtomicJournal(checkpoint, journal);
      await writeReport(report);
    }
  }
  if (EXECUTE && operations.length && report.failed === 0) {
    // Sample the whole plan, including objects accepted from a verified checkpoint.
    const sample = [operations[0], operations[Math.floor(operations.length / 2)],
      operations[operations.length - 1]];
    for (const op of new Map(sample.map((x) => [x.storage_path, x])).values()) {
      try { await privateFullGet(op); report.remote_full_sha_verified++; }
      catch (error) {
        report.failed++;
        delete journal.objects[op.storage_path];
        report.failures.push({ operation_id: op.operation_id,
          storage_path: op.storage_path,
          message: error instanceof Error ? error.message : String(error) });
      }
    }
    if (report.failed) {
      journal.updated_at = new Date().toISOString();
      await privateAtomicJournal(checkpoint, journal);
    }
  }
  report.pending = report.failed;
  await writeReport(report);
  console.log(JSON.stringify(report));
  if (report.failed) throw new Error("Private R2 staging incomplete; see report");
}

async function main() {
  if (PRIVATE_STUDIOS) return mainPrivate();
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
