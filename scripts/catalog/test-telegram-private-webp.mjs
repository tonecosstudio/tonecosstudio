import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";


const script = new URL("./build-telegram-webp-final.mjs", import.meta.url);
const profile = "telegram-webp-final-v1";

test("WebP privado: identidade estável, duplicação, Geral, checkpoint e retomada", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tonart-webp-"));
  const root = path.join(dir, "originals");
  const output = path.join(dir, "webp");
  const manifest = path.join(dir, "input.jsonl");
  try {
    await fs.mkdir(path.join(root, "Estudio-A"), { recursive: true });
    const input = path.join(root, "Estudio-A", "msg_10.png");
    await fs.writeFile(input, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGOclevBQApgIkn1qIZRDUNKAwAz8AFvOCKO2wAAAABJRU5ErkJggg==", "base64"));
    const original = await fs.readFile(input);
    const sha = crypto.createHash("sha256").update(original).digest("hex");
    const row = {
      message_id: 10, sha256: sha, telegram_origin_id: "2370335738",
      source_name: "Estudio-A/msg_10.png", original_topic: "Estudio-A",
      source_date: "2026-11-19", source_caption: "Render original", source_album: "album-1",
      status: "prepared_private", private_staging_only: true,
      category: "curadoria-privada", catalog_relpath: "curadoria-privada/teste/modelo-a",
      franchise: "Modelo A"
    };
    const run = async (records, limit = 100) => {
      await fs.writeFile(manifest, records.map(x => JSON.stringify(x)).join("\n") + "\n");
      return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [fileURLToPath(script), "--root", root,
          "--output", output, "--manifest", manifest, "--private-curadoria",
          "--limit", String(limit), "--checkpoint-size", "1"], { windowsHide: true });
        let stdout = "", stderr = "";
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", chunk => { stdout += chunk; });
        child.stderr.on("data", chunk => { stderr += chunk; });
        child.on("error", reject);
        child.on("close", status => resolve({ status, stdout, stderr }));
      });
    };
    const first = await run([row]);
    assert.equal(first.status, 0, first.stderr || first.stdout);
    let rows = (await fs.readFile(path.join(output, "manifests", "manifest_final.jsonl"), "utf8"))
      .trim().split("\n").map(JSON.parse);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].asset_key, ["telegram", "2370335738", sha, profile].join(":"));
    assert.equal(rows[0].source_caption, "Render original");
    assert.equal(rows[0].source_album, "album-1");
    const gallery = path.join(output, rows[0].display_relpath);
    const thumb = path.join(output, rows[0].thumb_relpath);
    assert.equal((await fs.readFile(gallery)).subarray(8, 12).toString(), "WEBP");
    assert.equal((await fs.readFile(thumb)).subarray(8, 12).toString(), "WEBP");
    const galleryHash = crypto.createHash("sha256").update(await fs.readFile(gallery)).digest("hex");
    const firstMtime = (await fs.stat(gallery)).mtimeMs;

    const renamed = { ...row, franchise: "Novo Nome", catalog_relpath: "curadoria-privada/outro/modelo" };
    const duplicate = { ...renamed, message_id: 11 };
    const general = { ...row, message_id: 12, original_topic: "Geral + 50k" };
    const second = await run([renamed, duplicate, general]);
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const report = JSON.parse(second.stdout);
    assert.equal(report.skipped_checkpoint, 1);
    assert.equal(report.reused_existing_outputs, 1);
    assert.equal(report.new_unique_derivations, 0);
    assert.equal(report.skipped_out_of_scope, 1);
    rows = (await fs.readFile(path.join(output, "manifests", "manifest_final.jsonl"), "utf8"))
      .trim().split("\n").map(JSON.parse);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map(x => x.message_id).sort(), [10, 11]);
    assert.equal(rows[0].display_relpath, rows[1].display_relpath);
    assert.equal(rows[0].thumb_relpath, rows[1].thumb_relpath);
    assert.equal(rows[0].original_name, "Novo Nome");
    assert.equal((await fs.stat(gallery)).mtimeMs, firstMtime);
    assert.equal(crypto.createHash("sha256").update(await fs.readFile(gallery)).digest("hex"), galleryHash);
    assert.deepEqual(await fs.readFile(input), original);

    const resumed = await run([renamed, duplicate, general]);
    assert.equal(resumed.status, 0, resumed.stderr || resumed.stdout);
    assert.equal(JSON.parse(resumed.stdout).new_records, 0);
    assert.equal(JSON.parse(resumed.stdout).skipped_checkpoint, 2);

    const mismatch = { ...row, message_id: 13, sha256: "f".repeat(64) };
    const invalid = await run([renamed, duplicate, general, mismatch]);
    assert.equal(invalid.status, 1);
    assert.match(await fs.readFile(path.join(output, "manifests", "webp_failures.jsonl"), "utf8"),
      /original_sha256_mismatch_before/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 80 })
      .catch((error) => {
        if (!["EBUSY", "EPERM"].includes(error.code)) throw error;
      });
  }
});
