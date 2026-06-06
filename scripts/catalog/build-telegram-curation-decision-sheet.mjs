import fs from "node:fs/promises";
import path from "node:path";

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
      "C:/Users/Casa/Downloads/ordax-catalogo-webp-final",
  ),
);
const PRIORITY = argValue("priority", "alta");
const VISUAL_DIR = path.join(OUTPUT, "manifests", "curadoria_visual", PRIORITY);
const GROUPS = path.resolve(
  argValue("groups", path.join(VISUAL_DIR, `grupos_${PRIORITY}.csv`)),
);
const VISUAL_INDEX = path.resolve(
  argValue("visual-index", path.join(VISUAL_DIR, `indice_visual_${PRIORITY}.json`)),
);
const DECISIONS = path.resolve(
  argValue("decisions", path.join(VISUAL_DIR, `decisoes_${PRIORITY}.csv`)),
);

const COLUMNS = [
  "status_decisao",
  "acao_sugerida",
  "prioridade",
  "folha",
  "cartao",
  "quantidade",
  "categoria_atual",
  "categoria_sugerida",
  "categoria_aprovada",
  "franquia_sugerida_pt_br",
  "franquia_aprovada_pt_br",
  "nome_sugerido_pt_br",
  "nome_aprovado_pt_br",
  "motivo_prioridade",
  "exemplo_display",
  "chave_grupo",
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

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else value += char;
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") {
      values.push(value);
      value = "";
    } else value += char;
  }

  values.push(value);
  return values;
}

async function readCsv(filePath) {
  if (!(await exists(filePath))) return { headers: [], rows: [] };

  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] || ""]),
    );
  });
  return { headers, rows };
}

async function readExistingDecisions() {
  const { rows } = await readCsv(DECISIONS);
  return new Map(rows.map((row) => [row.chave_grupo, row]));
}

function actionSuggestion(group) {
  const reason = String(group.motivo_prioridade || "");
  if (group.categoria_sugerida === "revisar" || reason.includes("categoria_revisar")) {
    return "bloquear_revisar";
  }
  if (reason.includes("categoria_fora_da_taxonomia")) return "corrigir_categoria";
  if (
    reason.includes("grupo_muito_grande") ||
    reason.includes("nome_generico_igual_franquia") ||
    reason.includes("nome_generico")
  ) {
    return "dividir_por_personagem";
  }
  if (reason.includes("nome_descritivo_em_ingles")) return "traduzir_ou_renomear";
  return "aprovar_ou_ajustar_nome";
}

function hasManualDecision(row) {
  if (!row || Object.keys(row).length === 0) return false;
  if (row.status_decisao && row.status_decisao !== "needs_decision") return true;
  return Boolean(
    row.categoria_aprovada ||
      row.franquia_aprovada_pt_br ||
      row.nome_aprovado_pt_br ||
      row.observacoes,
  );
}

function visualPosition(index, groupsPerSheet) {
  return {
    folha: Math.floor(index / groupsPerSheet) + 1,
    cartao: (index % groupsPerSheet) + 1,
  };
}

async function main() {
  const { rows: groups } = await readCsv(GROUPS);
  const visualIndex = JSON.parse(await fs.readFile(VISUAL_INDEX, "utf8"));
  const existing = await readExistingDecisions();
  const groupsPerSheet = Number(visualIndex.groups_per_sheet || 12);

  const decisions = groups.map((group, index) => {
    const previous = existing.get(group.chave_grupo) || {};
    const preserveManual = hasManualDecision(previous);
    const position = visualPosition(index, groupsPerSheet);

    return {
      status_decisao: previous.status_decisao || "needs_decision",
      acao_sugerida: preserveManual ? previous.acao_sugerida || actionSuggestion(group) : actionSuggestion(group),
      prioridade: group.prioridade,
      folha: String(position.folha).padStart(3, "0"),
      cartao: String(position.cartao).padStart(2, "0"),
      quantidade: group.quantidade,
      categoria_atual: group.categoria_atual,
      categoria_sugerida: group.categoria_sugerida,
      categoria_aprovada: previous.categoria_aprovada || group.categoria_aprovada || "",
      franquia_sugerida_pt_br: group.franquia_sugerida_pt_br,
      franquia_aprovada_pt_br:
        previous.franquia_aprovada_pt_br || group.franquia_aprovada_pt_br || "",
      nome_sugerido_pt_br: group.nome_sugerido_pt_br,
      nome_aprovado_pt_br: previous.nome_aprovado_pt_br || group.nome_aprovado_pt_br || "",
      motivo_prioridade: group.motivo_prioridade,
      exemplo_display: group.exemplo_display,
      chave_grupo: group.chave_grupo,
      observacoes: previous.observacoes || "",
    };
  });

  const csv = [
    COLUMNS.join(","),
    ...decisions.map((row) => COLUMNS.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n");

  await fs.writeFile(DECISIONS, `${csv}\n`, "utf8");

  const summary = {
    priority: PRIORITY,
    groups: decisions.length,
    decisions: DECISIONS,
    visual_index: VISUAL_INDEX,
    by_action: decisions.reduce((acc, row) => {
      acc[row.acao_sugerida] = (acc[row.acao_sugerida] || 0) + 1;
      return acc;
    }, {}),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
