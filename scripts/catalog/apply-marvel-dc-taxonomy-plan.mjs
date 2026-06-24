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

function argFlag(name) {
  return process.argv.includes(`--${name}`);
}

const APPLY = argFlag("apply");
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
const PLAN = path.resolve(
  argValue(
    "plan",
    path.join(
      OUTPUT,
      "manifests",
      "curadoria_visual",
      "marvel_dc_taxonomia",
      "aplicacao_dry_run",
      "dry_run_marvel_dc_taxonomia.csv",
    ),
  ),
);

function normalizeRelpath(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\/+/, "");
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

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function ensureInsideRoot(root, relpath) {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(root, normalizeRelpath(relpath));
  const rootWithSep = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`;

  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(rootWithSep)) {
    throw new Error(`Caminho fora do output: ${relpath}`);
  }

  return resolvedPath;
}

function validatePlan(rows) {
  const problems = [];
  for (const row of rows) {
    if (row.manifest_found !== "sim") problems.push(`${row.indice_visual}: ausente no manifesto`);
    if (row.display_exists !== "sim") problems.push(`${row.indice_visual}: display ausente`);
    if (row.thumb_exists !== "sim") problems.push(`${row.indice_visual}: thumb ausente`);
    if (row.existing_display_target_conflict === "sim") {
      problems.push(`${row.indice_visual}: conflito com destino display existente`);
    }
    if (row.existing_thumb_target_conflict === "sim") {
      problems.push(`${row.indice_visual}: conflito com destino thumb existente`);
    }
    if (row.duplicate_display_target === "sim") {
      problems.push(`${row.indice_visual}: destino display duplicado`);
    }
    if (row.duplicate_thumb_target === "sim") {
      problems.push(`${row.indice_visual}: destino thumb duplicado`);
    }
  }
  return problems;
}

async function renameInsideOutput(oldRelpath, newRelpath) {
  if (!oldRelpath || !newRelpath || oldRelpath === newRelpath) return false;

  const oldAbs = ensureInsideRoot(OUTPUT, oldRelpath);
  const newAbs = ensureInsideRoot(OUTPUT, newRelpath);
  await fs.mkdir(path.dirname(newAbs), { recursive: true });
  await fs.rename(oldAbs, newAbs);
  return true;
}

function applyManifestMetadata(record, row) {
  if (row.blocked_review === "sim") {
    return {
      ...record,
      curation_status: "blocked_review",
      taxonomy_blocked_reason: row.motivo,
      taxonomy_review_note: row.observacoes,
    };
  }

  return {
    ...record,
    display_relpath: normalizeRelpath(row.target_display_relpath),
    thumb_relpath: normalizeRelpath(row.target_thumb_relpath),
    final_category: row.categoria_aprovada,
    taxonomy_group: row.grupo_organizacao_aprovado,
    taxonomy_slug: row.personagem_slug_aprovado,
    public_name_pt_br: row.nome_aprovado_pt_br || record.public_name_pt_br || null,
    source_title: row.source_title_sugerido || record.source_title || null,
    source_type: row.source_type_sugerido || record.source_type || null,
    tags: row.tags_sugeridas
      ? row.tags_sugeridas.split(";").map((tag) => tag.trim()).filter(Boolean)
      : record.tags || [],
    curation_status: "taxonomy_applied",
    taxonomy_applied_action: row.acao_sugerida,
    taxonomy_applied_reason: row.motivo,
  };
}

async function main() {
  const [planRows, manifestRows] = await Promise.all([
    fs.readFile(PLAN, "utf8").then(parseCsv),
    readJsonl(MANIFEST),
  ]);
  const problems = validatePlan(planRows);
  if (problems.length > 0) {
    console.error(
      JSON.stringify(
        {
          apply: APPLY,
          ok_to_apply: false,
          problem_count: problems.length,
          problems: problems.slice(0, 50),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  const planByCurrentDisplay = new Map(
    planRows.map((row) => [normalizeRelpath(row.current_display_relpath), row]),
  );
  const updatedManifest = [];
  let displayMoves = 0;
  let thumbMoves = 0;
  let manifestUpdates = 0;
  let blockedReview = 0;

  for (const record of manifestRows) {
    const currentDisplay = normalizeRelpath(record.display_relpath);
    const planRow = planByCurrentDisplay.get(currentDisplay);

    if (!planRow) {
      updatedManifest.push(record);
      continue;
    }

    if (planRow.blocked_review === "sim") {
      blockedReview += 1;
      manifestUpdates += 1;
      updatedManifest.push(applyManifestMetadata(record, planRow));
      continue;
    }

    if (APPLY) {
      if (await renameInsideOutput(planRow.current_display_relpath, planRow.target_display_relpath)) {
        displayMoves += 1;
      }
      if (await renameInsideOutput(planRow.current_thumb_relpath, planRow.target_thumb_relpath)) {
        thumbMoves += 1;
      }
    } else {
      if (planRow.needs_display_move === "sim") displayMoves += 1;
      if (planRow.needs_thumb_move === "sim") thumbMoves += 1;
    }

    manifestUpdates += 1;
    updatedManifest.push(applyManifestMetadata(record, planRow));
  }

  let backupManifest = null;
  if (APPLY) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    backupManifest = `${MANIFEST}.before-marvel-dc-taxonomy-${stamp}.bak`;
    await fs.copyFile(MANIFEST, backupManifest);
    const tmpManifest = `${MANIFEST}.tmp`;
    await fs.writeFile(
      tmpManifest,
      `${updatedManifest.map((record) => JSON.stringify(record)).join("\n")}\n`,
      "utf8",
    );
    await fs.rename(tmpManifest, MANIFEST);
  }

  console.log(
    JSON.stringify(
      {
        apply: APPLY,
        physical_changes_applied: APPLY,
        output: OUTPUT,
        manifest: MANIFEST,
        plan: PLAN,
        ok_to_apply: true,
        display_moves: displayMoves,
        thumb_moves: thumbMoves,
        manifest_updates: manifestUpdates,
        blocked_review: blockedReview,
        backup_manifest: backupManifest,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
