import fs from "node:fs/promises";
import path from "node:path";
import { defaultTelegramWebpOutput } from "./telegram-paths.mjs";

function argValue(name, fallback = null) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const OUTPUT = path.resolve(
  argValue(
    "output",
    process.env.ORDAX_WEBP_OUTPUT ||
      defaultTelegramWebpOutput(),
  ),
);
const MANIFEST = path.resolve(
  argValue(
    "manifest",
    process.env.ORDAX_WEBP_FINAL_MANIFEST ||
      path.join(OUTPUT, "manifests", "manifest_final.jsonl"),
  ),
);
const DECISIONS = path.resolve(
  argValue(
    "decisions",
    path.join(
      OUTPUT,
      "manifests",
      "curadoria_visual",
      "marvel_dc_taxonomia",
      "decisoes_marvel_dc_taxonomia.csv",
    ),
  ),
);
const OUT_DIR = path.resolve(
  argValue(
    "out-dir",
    path.join(
      OUTPUT,
      "manifests",
      "curadoria_visual",
      "marvel_dc_taxonomia",
      "aplicacao_dry_run",
    ),
  ),
);

const PLAN_CSV = path.join(OUT_DIR, "dry_run_marvel_dc_taxonomia.csv");
const MOVES_CSV = path.join(OUT_DIR, "dry_run_marvel_dc_taxonomia_movimentos.csv");
const SUMMARY_JSON = path.join(OUT_DIR, "dry_run_marvel_dc_taxonomia_resumo.json");

const PLAN_COLUMNS = [
  "indice_visual",
  "status_decisao",
  "acao_sugerida",
  "categoria_atual",
  "pasta_nivel_2_atual",
  "pasta_personagem_atual",
  "categoria_aprovada",
  "grupo_organizacao_aprovado",
  "personagem_slug_aprovado",
  "nome_aprovado_pt_br",
  "source_title_sugerido",
  "source_type_sugerido",
  "manifest_found",
  "display_exists",
  "thumb_exists",
  "blocked_review",
  "needs_display_move",
  "needs_thumb_move",
  "existing_display_target_conflict",
  "existing_thumb_target_conflict",
  "duplicate_display_target",
  "duplicate_thumb_target",
  "current_display_relpath",
  "current_thumb_relpath",
  "target_display_relpath",
  "target_thumb_relpath",
  "raw_display_relpath_proposto",
  "tags_sugeridas",
  "motivo",
  "observacoes",
];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizeRelpath(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\/+/, "");
}

function posixJoin(...parts) {
  return path.posix.join(...parts.map((part) => normalizeRelpath(part)).filter(Boolean));
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rawRows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rawRows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rawRows.push(row);
  }

  const headers = rawRows.shift().map((header) => header.replace(/^\uFEFF/, ""));
  return rawRows
    .filter((rawRow) => rawRow.length && rawRow.some((value) => value !== ""))
    .map((rawRow) => Object.fromEntries(headers.map((header, index) => [header, rawRow[index] ?? ""])));
}

async function readJsonl(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = row[key] || "";
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function targetRelpaths(decision, manifestRecord) {
  if (decision.acao_sugerida === "bloquear_revisar") {
    return { display: "", thumb: "" };
  }

  const displayRelpath = normalizeRelpath(
    manifestRecord?.display_relpath || decision.display_relpath_atual,
  );
  const thumbRelpath = normalizeRelpath(
    manifestRecord?.thumb_relpath || displayRelpath.replace(/^display\//, "thumb/"),
  );
  const displayBase = path.posix.basename(displayRelpath);
  const thumbBase = path.posix.basename(thumbRelpath);
  const category = decision.categoria_aprovada;
  const group = decision.grupo_organizacao_aprovado;
  const slug = decision.personagem_slug_aprovado;

  return {
    display: posixJoin("display", category, group, slug, displayBase),
    thumb: posixJoin("thumb", category, group, slug, thumbBase),
  };
}

async function buildPlan() {
  const [manifestRows, decisionRows] = await Promise.all([
    readJsonl(MANIFEST),
    fs.readFile(DECISIONS, "utf8").then(parseCsv),
  ]);
  const manifestByDisplay = new Map(
    manifestRows.map((record) => [normalizeRelpath(record.display_relpath), record]),
  );

  const planRows = [];

  for (const decision of decisionRows) {
    const currentDisplay = normalizeRelpath(decision.display_relpath_atual);
    const manifestRecord = manifestByDisplay.get(currentDisplay);
    const currentThumb = normalizeRelpath(
      manifestRecord?.thumb_relpath || currentDisplay.replace(/^display\//, "thumb/"),
    );
    const targets = targetRelpaths(decision, manifestRecord);
    const blocked = decision.acao_sugerida === "bloquear_revisar";
    const displayExists = currentDisplay ? await exists(path.join(OUTPUT, currentDisplay)) : false;
    const thumbExists = currentThumb ? await exists(path.join(OUTPUT, currentThumb)) : false;
    const existingDisplayTargetConflict =
      !blocked &&
      targets.display !== currentDisplay &&
      (await exists(path.join(OUTPUT, targets.display)));
    const existingThumbTargetConflict =
      !blocked &&
      targets.thumb !== currentThumb &&
      (await exists(path.join(OUTPUT, targets.thumb)));

    planRows.push({
      indice_visual: decision.indice_visual,
      status_decisao: decision.status_decisao,
      acao_sugerida: decision.acao_sugerida,
      categoria_atual: decision.categoria_atual,
      pasta_nivel_2_atual: decision.pasta_nivel_2_atual,
      pasta_personagem_atual: decision.pasta_personagem_atual,
      categoria_aprovada: decision.categoria_aprovada,
      grupo_organizacao_aprovado: decision.grupo_organizacao_aprovado,
      personagem_slug_aprovado: decision.personagem_slug_aprovado,
      nome_aprovado_pt_br: decision.nome_aprovado_pt_br,
      source_title_sugerido: decision.source_title_sugerido,
      source_type_sugerido: decision.source_type_sugerido,
      manifest_found: manifestRecord ? "sim" : "nao",
      display_exists: displayExists ? "sim" : "nao",
      thumb_exists: thumbExists ? "sim" : "nao",
      blocked_review: blocked ? "sim" : "nao",
      needs_display_move: !blocked && targets.display !== currentDisplay ? "sim" : "nao",
      needs_thumb_move: !blocked && targets.thumb !== currentThumb ? "sim" : "nao",
      existing_display_target_conflict: existingDisplayTargetConflict ? "sim" : "nao",
      existing_thumb_target_conflict: existingThumbTargetConflict ? "sim" : "nao",
      duplicate_display_target: "nao",
      duplicate_thumb_target: "nao",
      current_display_relpath: currentDisplay,
      current_thumb_relpath: currentThumb,
      target_display_relpath: targets.display,
      target_thumb_relpath: targets.thumb,
      raw_display_relpath_proposto: normalizeRelpath(decision.display_relpath_proposto),
      tags_sugeridas: decision.tags_sugeridas,
      motivo: decision.motivo,
      observacoes: decision.observacoes,
    });
  }

  const displayTargets = new Map();
  const thumbTargets = new Map();
  for (const row of planRows) {
    if (row.target_display_relpath) {
      const rows = displayTargets.get(row.target_display_relpath) || [];
      rows.push(row);
      displayTargets.set(row.target_display_relpath, rows);
    }
    if (row.target_thumb_relpath) {
      const rows = thumbTargets.get(row.target_thumb_relpath) || [];
      rows.push(row);
      thumbTargets.set(row.target_thumb_relpath, rows);
    }
  }

  for (const rows of displayTargets.values()) {
    if (rows.length <= 1) continue;
    for (const row of rows) row.duplicate_display_target = "sim";
  }
  for (const rows of thumbTargets.values()) {
    if (rows.length <= 1) continue;
    for (const row of rows) row.duplicate_thumb_target = "sim";
  }

  return { manifestRows, decisionRows, planRows };
}

async function writeCsv(filePath, rows) {
  const body = [
    PLAN_COLUMNS.join(","),
    ...rows.map((row) => PLAN_COLUMNS.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n");
  await fs.writeFile(filePath, `${body}\n`, "utf8");
}

async function main() {
  const { manifestRows, decisionRows, planRows } = await buildPlan();
  const moveRows = planRows.filter(
    (row) =>
      row.needs_display_move === "sim" ||
      row.needs_thumb_move === "sim" ||
      row.blocked_review === "sim",
  );
  const summary = {
    generated_at: new Date().toISOString(),
    output: OUTPUT,
    manifest: MANIFEST,
    decisions: DECISIONS,
    dry_run: true,
    physical_changes_applied: false,
    total_manifest_rows: manifestRows.length,
    total_decision_rows: decisionRows.length,
    total_plan_rows: planRows.length,
    total_move_or_review_rows: moveRows.length,
    by_action: countBy(planRows, "acao_sugerida"),
    by_status: countBy(planRows, "status_decisao"),
    by_target_group: countBy(
      planRows.map((row) => ({
        target_group: row.blocked_review === "sim"
          ? "bloqueado/revisar"
          : `${row.categoria_aprovada}/${row.grupo_organizacao_aprovado}`,
      })),
      "target_group",
    ),
    checks: {
      manifest_missing: planRows.filter((row) => row.manifest_found === "nao").length,
      display_missing: planRows.filter((row) => row.display_exists === "nao").length,
      thumb_missing: planRows.filter((row) => row.thumb_exists === "nao").length,
      blocked_review: planRows.filter((row) => row.blocked_review === "sim").length,
      planned_display_moves: planRows.filter((row) => row.needs_display_move === "sim").length,
      planned_thumb_moves: planRows.filter((row) => row.needs_thumb_move === "sim").length,
      existing_display_target_conflicts: planRows.filter(
        (row) => row.existing_display_target_conflict === "sim",
      ).length,
      existing_thumb_target_conflicts: planRows.filter(
        (row) => row.existing_thumb_target_conflict === "sim",
      ).length,
      duplicate_display_targets: planRows.filter((row) => row.duplicate_display_target === "sim").length,
      duplicate_thumb_targets: planRows.filter((row) => row.duplicate_thumb_target === "sim").length,
    },
    outputs: {
      plan_csv: PLAN_CSV,
      moves_csv: MOVES_CSV,
      summary_json: SUMMARY_JSON,
    },
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    writeCsv(PLAN_CSV, planRows),
    writeCsv(MOVES_CSV, moveRows),
    fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, "utf8"),
  ]);

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
