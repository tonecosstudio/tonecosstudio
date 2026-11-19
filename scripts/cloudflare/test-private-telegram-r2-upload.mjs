#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const uploader = path.join(path.dirname(fileURLToPath(import.meta.url)), "upload-catalog-webp-to-r2.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tonart-r2-mock-"));
const originalSha = crypto.createHash("sha256").update("original-private").digest("hex");
const bytes = Buffer.from("RIFF\u0008\u0000\u0000\u0000WEBPVP8 ");
const sha = crypto.createHash("sha256").update(bytes).digest("hex");
const webp = path.join(tmp, "image.webp");
fs.writeFileSync(webp, bytes);
const prefix = "telegram-studios/v1/2370335738/telegram-webp-final-v1/" +
  originalSha.slice(0,2) + "/" + originalSha;
const mk = role => ({
  operation_id: "2370335738:" + originalSha + ":telegram-webp-final-v1:" + role,
  asset_role: role,
  telegram_origin_id: "2370335738", profile_version: "telegram-webp-final-v1",
  original_sha256: originalSha, message_ids: [123, 124],
  evidence_ref: "mock-test-authorization",
  private_staging_only: true,
  status: "ready_for_upload", storage_bucket: "tonecos-catalogo-staging",
  storage_path: prefix + "/" + role + ".webp",
  local_path: webp, expected_bytes: bytes.length, sha256: sha,
});
const planFile = path.join(tmp, "plan.json");
const reportFile = path.join(tmp, "report.json");
const checkpoint = path.join(tmp, "checkpoint.json");
fs.writeFileSync(planFile, JSON.stringify({
  mode: "private_telegram_studios", namespace: "telegram-studios/v1",
  storage_bucket: "tonecos-catalogo-staging", operations: [mk("display"), mk("thumb")],
}));
const objects = new Map();
let writes = 0;
let requests = 0;
const server = http.createServer(async (req, res) => {
  requests++;
  const key = decodeURI(req.url.split("?")[0]).replace(/^\/tonecos-catalogo-staging\//, "");
  const hit = objects.get(key);
  if (req.method === "HEAD") {
    if (!hit) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {
      "content-length": String(hit.body.length),
      "etag": '"mock-etag"',
      "x-amz-meta-optimized-sha256": hit.hash,
      "x-amz-meta-original-sha256": hit.originalSha,
    }); res.end(); return;
  }
  if (req.method === "PUT") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    if (req.headers["cache-control"] !== "private, no-store") {
      res.writeHead(400);res.end("not private");return;
    }
    const hash = crypto.createHash("sha256").update(body).digest("hex");
    if (hash !== req.headers["x-amz-meta-optimized-sha256"] ||
        req.headers["x-amz-meta-original-sha256"] !== originalSha) {
      res.writeHead(400); res.end("bad metadata"); return;
    }
    objects.set(key, { body, hash, originalSha }); writes++;
    res.writeHead(200); res.end(); return;
  }
  if (req.method === "GET") {
    if (!hit) { res.writeHead(404);res.end();return; }
    res.writeHead(200, { "content-type": "image/webp" }); res.end(hit.body); return;
  }
  res.writeHead(405);res.end();
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const env = {
  ...process.env,
  CLOUDFLARE_ACCOUNT_ID: "mock-account",
  CLOUDFLARE_R2_ACCESS_KEY_ID: "mock-access-key",
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: "mock-secret-key",
  CLOUDFLARE_R2_ENDPOINT: "http://127.0.0.1:" + port,
  CLOUDFLARE_R2_BUCKET: "tonecos-catalogo-staging",
  CLOUDFLARE_R2_ALLOW_OVERWRITE: "false",
  CLOUDFLARE_R2_EXECUTE: "false",
};
const run = () => new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [uploader, "--private-telegram-studios",
    "--execute", "--plan", planFile, "--report", reportFile,
    "--checkpoint", checkpoint, "--concurrency", "2"], { env, stdio: ["ignore","pipe","pipe"] });
  let out = "", err = "";
  p.stdout.on("data", b => out += b);
  p.stderr.on("data", b => err += b);
  const timer = setTimeout(() => p.kill(), 20000);
  p.on("error", reject);
  p.on("close", code => { clearTimeout(timer); resolve({code, out, err}); });
});
try {
  let first = await run();
  assert.equal(first.code, 0, first.err);
  let report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  assert.equal(report.uploaded, 2);
  assert.equal(report.reused, 0);
  assert.equal(report.remote_head_verified, 2);
  assert.equal(report.remote_full_sha_verified, 2);
  assert.equal(report.bytes_transferred, bytes.length*2);
  assert.equal(writes, 2);
  assert.ok(fs.existsSync(checkpoint));
  const second = await run();
  assert.equal(second.code, 0, second.err);
  report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  assert.equal(report.uploaded, 0);
  assert.equal(report.reused, 2);
  assert.equal(writes, 2);
  const target = objects.get(prefix + "/display.webp");
  objects.set(prefix + "/display.webp", {...target, hash: "f".repeat(64)});
  const third = await run();
  assert.notEqual(third.code, 0);
  report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  assert.equal(report.failed, 1);
  assert.equal(report.pending, 1);
  assert.equal(writes, 2);
  console.log("Mock R2 E2E: upload, SHA HEAD/GET, reuse, checkpoint, collision fail-closed; requests=" + requests);
} finally {
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(tmp, { recursive: true, force: true });
}
