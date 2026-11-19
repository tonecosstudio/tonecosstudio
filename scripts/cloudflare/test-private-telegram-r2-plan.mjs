#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)),
  "build-private-telegram-r2-plan.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tonart-r2-private-test-"));
const root = path.join(tmp, "webp");
const manifestDir = path.join(root, "manifests");
const output = path.join(manifestDir, "r2_private");
const sourceHash = crypto.createHash("sha256").update("synthetic-original").digest("hex");
const webp = Buffer.from("RIFF\u0008\u0000\u0000\u0000WEBPVP8 ");
const webpHash = crypto.createHash("sha256").update(webp).digest("hex");

function run(extra = []) {
  return spawnSync(process.execPath, [script, "--output", root,
    "--manifest", path.join(manifestDir, "manifest_final.jsonl"), ...extra],
  { encoding: "utf8", timeout: 20000 });
}
function plan() {
  return JSON.parse(fs.readFileSync(path.join(output,
    "telegram_studios_r2_private_upload_plan.json"), "utf8"));
}
try {
  fs.mkdirSync(path.join(root, "display"), { recursive: true });
  fs.mkdirSync(path.join(root, "thumb"), { recursive: true });
  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(path.join(root, "display", "item.webp"), webp);
  fs.writeFileSync(path.join(root, "thumb", "item.webp"), webp);
  const row = {
    message_id: 100, source_type: "telegram",
    telegram_origin_id: "2370335738",
    original_topic: "Studio Test",
    source_sha256: sourceHash,
    profile_version: "telegram-webp-final-v1",
    private_staging_only: true,
    display_sha256: webpHash, thumb_sha256: webpHash,
    display_bytes: webp.length, thumb_bytes: webp.length,
    display_relpath: "display/item.webp", thumb_relpath: "thumb/item.webp",
  };
  const manifest = path.join(manifestDir, "manifest_final.jsonl");
  const duplicate = { ...row, message_id: 101 };
  fs.writeFileSync(manifest, JSON.stringify(row) + "\n" +
    JSON.stringify(duplicate) + "\n", "utf8");
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  assert.equal(plan().summary.source_messages, 2);
  assert.equal(plan().summary.unique_original_sha256, 1);
  assert.equal(plan().summary.ready_to_upload, 0);
  assert.equal(plan().summary.blocked_missing_external_authorization, 2);
  assert.deepEqual(plan().operations[0].message_ids, [100, 101]);
  assert.ok(!plan().operations[0].storage_path.includes("Studio Test"));
  const authFile = path.join(tmp, "storage-authorization.jsonl");
  fs.writeFileSync(authFile, JSON.stringify({
    telegram_origin_id: row.telegram_origin_id,
    profile_version: row.profile_version,
    source_sha256: row.source_sha256,
    bucket: "tonecos-catalogo-staging",
    scope: "private_r2_storage",
    external_storage_authorized: true,
    evidence_ref: "synthetic-test-only",
  }) + "\n");
  const positive = run(["--authorizations", authFile]);
  assert.equal(positive.status, 0, positive.stderr);
  const allowed = plan();
  assert.equal(allowed.summary.ready_to_upload, 2);
  assert.equal(allowed.summary.eligible_bytes, webp.length * 2);
  assert.ok(allowed.operations.every((x) =>
    x.status === "ready_for_upload" &&
    x.storage_path.includes(sourceHash) &&
    x.storage_bucket === "tonecos-catalogo-staging" &&
    x.cache_control === "private, no-store"));
  const uploader = path.join(path.dirname(fileURLToPath(import.meta.url)),
    "upload-catalog-webp-to-r2.mjs");
  const dryReport = path.join(tmp, "uploader-dryrun.json");
  const dry = spawnSync(process.execPath, [uploader, "--private-telegram-studios",
    "--bucket", "tonecos-catalogo-staging", "--plan",
    path.join(output, "telegram_studios_r2_private_upload_plan.json"),
    "--report", dryReport], { encoding: "utf8", timeout: 15000 });
  assert.equal(dry.status, 0, dry.stderr);
  const dryInfo = JSON.parse(fs.readFileSync(dryReport, "utf8"));
  assert.equal(dryInfo.dry_run_ready, 2);
  assert.equal(dryInfo.uploaded, 0);
  assert.equal(dryInfo.reused, 0);
  // A origem permite armazenamento privado, sem aprovar publicacao comercial.
  const originPolicy = {
    policy_type: "telegram_origin",
    telegram_origin_id: row.telegram_origin_id,
    bucket: "tonecos-catalogo-staging",
    source_collection: "telegram_studios",
    scope: "private_r2_storage",
    external_storage_authorized: true,
    evidence_ref: "synthetic-origin-evidence-test",
    excluded_topics: ["Geral +50k"],
    excluded_sha256: [],
  };
  fs.writeFileSync(authFile, JSON.stringify(originPolicy) + "\n");
  assert.equal(run(["--authorizations", authFile]).status, 0);
  assert.equal(plan().summary.ready_to_upload, 2);
  assert.equal(plan().summary.public_release_authorized, false);
  const withException = {
    ...originPolicy, excluded_sha256: [row.source_sha256],
  };
  fs.writeFileSync(authFile, JSON.stringify(withException) + "\n");
  assert.equal(run(["--authorizations", authFile]).status, 0);
  assert.equal(plan().summary.ready_to_upload, 0);
  assert.equal(plan().summary.blocked_missing_external_authorization, 2);
  fs.writeFileSync(authFile, JSON.stringify(originPolicy) + "\n" +
    JSON.stringify({
      telegram_origin_id: row.telegram_origin_id,
      source_sha256: row.source_sha256,
      profile_version: row.profile_version,
      bucket: "tonecos-catalogo-staging",
      scope: "private_r2_storage",
      external_storage_authorized: false,
    }) + "\n");
  assert.equal(run(["--authorizations", authFile]).status, 0);
  assert.equal(plan().summary.ready_to_upload, 0);
  fs.writeFileSync(authFile, JSON.stringify(originPolicy) + "\n");
  const repeat = run(["--authorizations", authFile]);
  assert.equal(repeat.status, 0, repeat.stderr);
  assert.deepEqual(plan().operations.map((x) => x.storage_path),
    allowed.operations.map((x) => x.storage_path));
  fs.writeFileSync(path.join(root, "thumb", "item.webp"), Buffer.from("bad"));
  const corrupt = run(["--authorizations", authFile]);
  assert.equal(corrupt.status, 2, corrupt.stderr);
  assert.equal(plan().summary.local_integrity_failures, 1);
  assert.equal(plan().summary.ready_to_upload, 1);
  const general = { ...row, message_id: 102, original_topic: "Geral + 50k" };
  fs.writeFileSync(manifest, JSON.stringify(general) + "\n");
  assert.equal(run().status, 1, "Geral must never enter private R2");
  console.log("R2 private staging: 6/6 assertions categories passed");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
