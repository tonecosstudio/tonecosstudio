#!/usr/bin/env node
// Adaptador privado do manifesto canônico WebP para o uploadador R2 existente.
// Não autentica, envia ou publica; fail-closed sem autorização explícita por SHA.
import crypto from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { defaultTelegramWebpOutput } from "../catalog/telegram-paths.mjs";

const HASH = /^[a-f0-9]{64}$/;
const PROFILE = /^[a-z0-9][a-z0-9_-]{0,100}$/i;
const ORIGIN = /^[0-9]{1,30}$/;
const BUCKET = "tonecos-catalogo-staging";
const NAMESPACE = "telegram-studios/v1";
const SOURCE_TYPE = "telegram";
function topicKey(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/\s+/gu, "");
}
const GENERAL_EXCLUDED = topicKey("Geral +50k");
// O uploadador verifica SHA e bytes imediatamente antes de PUT/HEAD.
const DEFER_LOCAL_HASH = process.argv.includes("--defer-local-hash");

function arg(name, fallback = null) {
  const eq = process.argv.find((x) => x.startsWith("--" + name + "="));
  if (eq) return eq.slice(name.length + 3);
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
function required(condition, message) {
  if (!condition) throw new Error(message);
}
function lines(text) {
  return text.split(/\r?\n/u).filter((x) => x.trim());
}
function key(row) {
  return [row.telegram_origin_id, row.profile_version, row.source_sha256].join(":");
}
function validRow(row) {
  required(row && typeof row === "object", "Registro Telegram invalido");
  required(row.source_type === SOURCE_TYPE, "Origem nao e Telegram");
  required(row.private_staging_only === true, "Somente staging privado e aceito");
  required(topicKey(row.original_topic) !== GENERAL_EXCLUDED,
    "Tentativa de incluir o topico Geral");
  required(ORIGIN.test(String(row.telegram_origin_id || "")), "ID origem invalido");
  required(HASH.test(String(row.source_sha256 || "")), "SHA original invalido");
  required(PROFILE.test(String(row.profile_version || "")), "Perfil WebP invalido");
  required(Number.isSafeInteger(Number(row.message_id)) && Number(row.message_id) > 0,
    "ID de mensagem invalido");
  for (const role of ["display", "thumb"]) {
    required(HASH.test(String(row[role + "_sha256"] || "")), "SHA derivado invalido");
    required(Number.isSafeInteger(row[role + "_bytes"]) && row[role + "_bytes"] > 0,
      "Tamanho WebP invalido");
    required(typeof row[role + "_relpath"] === "string" &&
      row[role + "_relpath"].replaceAll("\\", "/").startsWith(role + "/"),
      "Caminho da derivacao invalido");
  }
}
function parseAuthorization(text) {
  const byAsset = new Map();
  const byOrigin = new Map();
  for (const item of lines(text)) {
    const row = JSON.parse(item);
    required(row && ORIGIN.test(String(row.telegram_origin_id || "")),
      "Autorizacao com origem Telegram invalida");
    required(row.bucket === BUCKET, "Autorizacao para bucket diferente");
    if (row.policy_type === "telegram_origin") {
      required(!byOrigin.has(String(row.telegram_origin_id)),
        "Politica de origem duplicada");
      required(row.scope === "private_r2_storage" &&
        row.external_storage_authorized === true &&
        typeof row.evidence_ref === "string" && row.evidence_ref.trim() &&
        row.source_collection === "telegram_studios",
        "Politica da origem deve comprovar armazenamento externo privado");
      const excludedTopics = row.excluded_topics;
      required(Array.isArray(excludedTopics) &&
        excludedTopics.some(x => topicKey(x) === GENERAL_EXCLUDED),
        "A politica deve preservar a exclusao do Geral +50k");
      required(excludedTopics.every(x => typeof x === "string" && x.trim()),
        "Topico excluido invalido");
      const excludedHashes = row.excluded_sha256 ?? [];
      required(Array.isArray(excludedHashes) &&
        excludedHashes.every(x => HASH.test(x)), "SHA excluido invalido");
      byOrigin.set(String(row.telegram_origin_id), {
        evidence: row.evidence_ref.trim(),
        excludedTopics: new Set(excludedTopics.map(topicKey)),
        excludedHashes: new Set(excludedHashes),
      });
      continue;
    }
    required(HASH.test(String(row.source_sha256 || "")) &&
      PROFILE.test(String(row.profile_version || "")),
      "Autorizacao de arquivo com SHA/perfil invalido");
    const k = key(row);
    required(!byAsset.has(k), "Autorizacao de arquivo duplicada: " + k);
    if (row.external_storage_authorized === true) {
      required(row.scope === "private_r2_storage" &&
        typeof row.evidence_ref === "string" && row.evidence_ref.trim(),
        "Falta evidencia de permissao externa: " + k);
      byAsset.set(k, row.evidence_ref.trim());
    } else {
      byAsset.set(k, null);
    }
  }
  return {
    get(k, group) {
      // Excecao ou bloqueio por SHA tem precedencia sobre a politica da origem.
      if (byAsset.has(k)) return byAsset.get(k);
      const policy = byOrigin.get(String(group.row.telegram_origin_id));
      if (!policy || policy.excludedHashes.has(group.row.source_sha256)) return null;
      if ([...group.topics].some(topic =>
        policy.excludedTopics.has(topicKey(topic)))) return null;
      return policy.evidence;
    },
  };
}
async function validatedLocal(root, rel, expectedSize, expectedHash, role) {
  const normalized = rel.replaceAll("\\", "/");
  if (!normalized.startsWith(role + "/") ||
      normalized.split("/").some((part) => part === ".." || part === "." || !part)) {
    return { error: "unsafe_relative_path" };
  }
  const file = path.resolve(root, normalized);
  if (!file.startsWith(root + path.sep)) return { error: "path_outside_staging" };
  try {
    const real = await fs.realpath(file);
    if (!real.startsWith(root + path.sep)) return { error: "symlink_outside_staging" };
    const stat = await fs.stat(real);
    if (!stat.isFile() || stat.size !== expectedSize) {
      return { error: "missing_or_size_mismatch" };
    }
    if (DEFER_LOCAL_HASH) return { file: real, bytes: stat.size, hash_verification_deferred: true };
    const f = await fs.open(real, "r");
    let header;
    try {
      header = Buffer.alloc(12);
      const r = await f.read(header, 0, 12, 0);
      if (r.bytesRead !== 12 ||
          header.toString("ascii", 0, 4) !== "RIFF" ||
          header.toString("ascii", 8, 12) !== "WEBP") {
        return { error: "invalid_webp_magic" };
      }
    } finally { await f.close(); }
    const sha = crypto.createHash("sha256");
    for await (const piece of createReadStream(real, { highWaterMark: 1024 * 1024 })) {
      sha.update(piece);
    }
    if (sha.digest("hex") !== expectedHash) return { error: "derivative_sha256_mismatch" };
    return { file: real, bytes: stat.size };
  } catch (error) {
    if (error && error.code === "ENOENT") return { error: "missing_webp" };
    throw error;
  }
}
async function atomicJson(file, value) {
  const temp = file + ".tmp";
  await fs.writeFile(temp, JSON.stringify(value, null, 2) + "\n", "utf8");
  await fs.rename(temp, file);
}
async function main() {
  const root = path.resolve(arg("output", defaultTelegramWebpOutput()));
  const realRoot = await fs.realpath(root);
  const manifestPath = path.resolve(arg("manifest", path.join(root, "manifests", "manifest_final.jsonl")));
  const outDir = path.resolve(arg("out-dir", path.join(root, "manifests", "r2_private")));
  const authorizationArg = arg("authorizations");
  const authPath = authorizationArg ? path.resolve(authorizationArg) : null;
  required(!outDir.includes(path.sep + ".git" + path.sep), "Saida nao deve ficar no Git");
  required(outDir !== realRoot && outDir.startsWith(realRoot + path.sep),
    "Saida R2 privada deve ficar nos manifests do staging");
  const rows = lines(await fs.readFile(manifestPath, "utf8"));
  const unique = new Map();
  for (const line of rows) {
    const row = JSON.parse(line);
    validRow(row);
    const k = key(row);
    const previous = unique.get(k);
    if (previous) {
      for (const role of ["display", "thumb"]) {
        required(previous.row[role + "_sha256"] === row[role + "_sha256"] &&
          previous.row[role + "_bytes"] === row[role + "_bytes"],
          "Conflito de derivacao para mesmo SHA: " + k);
      }
      previous.messageIds.add(Number(row.message_id));
      previous.topics.add(String(row.original_topic));
    } else {
      unique.set(k, { row, messageIds: new Set([Number(row.message_id)]),
        topics: new Set([String(row.original_topic)]) });
    }
  }
  let grants = new Map();
  if (authPath) grants = parseAuthorization(await fs.readFile(authPath, "utf8"));
  const operations = [];
  let integrityFailures = 0;
  for (const [k, group] of [...unique.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const r = group.row;
    const evidence = grants.get(k, group);
    for (const role of ["display", "thumb"]) {
      const expectedHash = r[role + "_sha256"];
      const relative = r[role + "_relpath"];
      // Sem concessao de armazenamento externo, nem abrir milhares de arquivos privados.
      // A auditoria WebP independente valida o acervo; o uploadador valida os elegiveis.
      const local = evidence
        ? await validatedLocal(realRoot, relative, r[role + "_bytes"], expectedHash, role)
        : { error: null, file: null, bytes: null };
      const reason = evidence
        ? (local.error || null) : "external_storage_authorization_missing";
      if (local.error) integrityFailures += 1;
      const operation = {
        operation_id: [r.telegram_origin_id, r.source_sha256, r.profile_version, role].join(":"),
        asset_role: role,
        storage_bucket: BUCKET,
        storage_path: [NAMESPACE, r.telegram_origin_id, r.profile_version,
          r.source_sha256.slice(0, 2), r.source_sha256, role + ".webp"].join("/"),
        status: reason ? "blocked" : "ready_for_upload",
        reject_reason: reason,
        local_relpath: relative,
        local_path: local.file || null,
        expected_bytes: r[role + "_bytes"],
        actual_bytes: local.bytes || null,
        sha256: expectedHash,
        original_sha256: r.source_sha256,
        telegram_origin_id: r.telegram_origin_id,
        profile_version: r.profile_version,
        message_ids: [...group.messageIds].sort((a, b) => a - b),
        original_topics: [...group.topics].sort(),
        evidence_ref: evidence || null,
        content_type: "image/webp",
        cache_control: "private, no-store",
        private_staging_only: true,
      };
      operations.push(operation);
    }
  }
  const ready = operations.filter((x) => x.status === "ready_for_upload");
  const blocked = operations.filter((x) => x.status === "blocked");
  const summary = {
    mode: "private_telegram_studios",
    bucket: BUCKET, namespace: NAMESPACE,
    source_manifest: manifestPath,
    authorization_file: authPath,
    source_messages: rows.length, unique_original_sha256: unique.size,
    local_derivations: operations.length,
    locally_valid: ready.length,
    local_not_rechecked_due_missing_authorization: operations.length - ready.length - integrityFailures,
    local_integrity_failures: integrityFailures,
    local_sha256_checks_deferred_to_uploader: DEFER_LOCAL_HASH ? ready.length : 0,
    ready_to_upload: ready.length,
    blocked_missing_external_authorization: blocked.filter(
      (x) => x.reject_reason === "external_storage_authorization_missing").length,
    pending_or_blocked: blocked.length,
    eligible_bytes: ready.reduce((a, x) => a + x.expected_bytes, 0),
    all_unique_webp_bytes: operations.reduce((a, x) => a + x.expected_bytes, 0),
    public_release_authorized: false, externally_uploaded: false,
  };
  await fs.mkdir(outDir, { recursive: true });
  const planPath = path.join(outDir, "telegram_studios_r2_private_upload_plan.json");
  const manifestOut = path.join(outDir, "telegram_studios_r2_private_manifest.jsonl");
  await atomicJson(planPath, { mode: summary.mode, storage_bucket: BUCKET,
    namespace: NAMESPACE, summary, operations });
  await fs.writeFile(manifestOut, operations.map((x) => JSON.stringify(x)).join("\n") + "\n", "utf8");
  await atomicJson(path.join(outDir, "telegram_studios_r2_private_summary.json"), summary);
  console.log(JSON.stringify({ ...summary, plan_path: planPath, manifest_path: manifestOut }));
  if (integrityFailures) process.exitCode = 2;
}
main().catch((error) => { console.error(error.message || String(error)); process.exitCode = 1; });
