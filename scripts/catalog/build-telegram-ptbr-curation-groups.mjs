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
const MANIFESTS_DIR = path.join(OUTPUT, "manifests");
const QUEUE = path.resolve(
  argValue(
    "queue",
    process.env.ORDAX_PTBR_NAME_QUEUE ||
      path.join(MANIFESTS_DIR, "revisao_nomes_ptbr.csv"),
  ),
);
const GROUPS = path.resolve(
  argValue(
    "groups",
    process.env.ORDAX_PTBR_GROUPS_QUEUE ||
      path.join(MANIFESTS_DIR, "grupos_curadoria_ptbr.csv"),
  ),
);
const SUMMARY = path.resolve(
  argValue(
    "summary",
    process.env.ORDAX_PTBR_GROUPS_SUMMARY ||
      path.join(MANIFESTS_DIR, "resumo_grupos_curadoria_ptbr.json"),
  ),
);

const COLUMNS = [
  "status_grupo",
  "prioridade",
  "motivo_prioridade",
  "quantidade",
  "categoria_atual",
  "categoria_sugerida",
  "categoria_aprovada",
  "franquia_sugerida_pt_br",
  "franquia_aprovada_pt_br",
  "nome_sugerido_pt_br",
  "nome_aprovado_pt_br",
  "aliases_sugeridos",
  "tags_publicas_sugeridas",
  "exemplo_source",
  "exemplo_display",
  "exemplos_sources",
  "exemplos_display",
  "chave_grupo",
];

const TAXONOMY = new Set([
  "acessorios",
  "anime",
  "animacao",
  "brinquedos",
  "decoracao",
  "desenhos",
  "dc",
  "dinosaurios",
  "esportes",
  "figuras-militares",
  "filmes",
  "games",
  "horror",
  "marvel",
  "musica",
  "original",
  "props",
  "quadrinhos",
  "sci-fi",
  "series",
  "star-wars",
  "tabletop",
  "tv",
  "veiculos",
  "vtubers",
]);

const CATEGORY_SUGGESTIONS = new Map(
  Object.entries({
    brands: "props",
    crossover: "revisar",
    crossovers: "revisar",
    dc: "dc",
    dinosaurios: "dinosaurios",
    fantasy: "tabletop",
    "figuras-militares": "figuras-militares",
    historicos: "tabletop",
    holiday: "props",
    horror: "horror",
    internet: "props",
    marvel: "marvel",
    pokemon: "games",
    revisar: "revisar",
    "star-wars": "star-wars",
    tematicos: "props",
    "web-series": "series",
  }),
);

const GENERIC_NAMES = new Set([
  "dc",
  "marvel",
  "dragon ball",
  "star wars",
  "street fighter",
  "anime",
  "games",
  "pokemon",
  "original",
]);

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
}

async function readCsv(filePath) {
  if (!(await exists(filePath))) return [];

  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] || ""]),
    );
  });
}

async function readExistingGroups() {
  const rows = await readCsv(GROUPS);
  return new Map(rows.map((row) => [row.chave_grupo, row]));
}

function groupKey(row) {
  return [
    row.categoria_final,
    row.sugestao_franquia_pt_br,
    row.sugestao_nome_pt_br,
  ]
    .map(normalizeComparable)
    .join("|");
}

function categorySuggestion(category) {
  const normalized = normalizeComparable(category).replace(/\s+/g, "-");
  if (TAXONOMY.has(normalized)) return normalized;
  return CATEGORY_SUGGESTIONS.get(normalized) || "revisar";
}

function priorityFor(group) {
  const category = normalizeComparable(group.categoria_atual).replace(/\s+/g, "-");
  const name = normalizeComparable(group.nome_sugerido_pt_br);
  const franchise = normalizeComparable(group.franquia_sugerida_pt_br);
  const reasons = [];

  if (!TAXONOMY.has(category)) reasons.push("categoria_fora_da_taxonomia");
  if (category === "revisar") reasons.push("categoria_revisar");
  if (group.quantidade >= 100) reasons.push("grupo_muito_grande");
  if (group.quantidade >= 30 && group.quantidade < 100) reasons.push("grupo_grande");
  if (name && franchise && name === franchise && GENERIC_NAMES.has(name)) {
    reasons.push("nome_generico_igual_franquia");
  }
  if (category && franchise && category === franchise && category !== "vtubers") {
    reasons.push("franquia_generica_igual_categoria");
  }
  if (GENERIC_NAMES.has(name)) reasons.push("nome_generico");
  if (/\b(groups?|units?|figures?|terrain|creatures?|squads?)\b/i.test(group.nome_sugerido_pt_br)) {
    reasons.push("nome_descritivo_em_ingles");
  }
  if (
    category === "games" &&
    franchise === "pokemon" &&
    /\b(batch\d*|view|continuation)\b/i.test(group.nome_sugerido_pt_br)
  ) {
    reasons.push("pokemon_generico_lote");
  }

  if (
    reasons.includes("categoria_revisar") ||
    reasons.includes("categoria_fora_da_taxonomia") ||
    reasons.includes("grupo_muito_grande") ||
    reasons.includes("nome_generico_igual_franquia") ||
    (reasons.includes("franquia_generica_igual_categoria") && group.quantidade >= 10)
  ) {
    return { prioridade: "alta", motivo: reasons.join("; ") };
  }

  if (reasons.length > 0) return { prioridade: "media", motivo: reasons.join("; ") };
  return { prioridade: "baixa", motivo: "" };
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function hasManualGroupDecision(row) {
  if (!row || Object.keys(row).length === 0) return false;
  if (row.status_grupo && row.status_grupo !== "needs_review") return true;
  return Boolean(
    row.categoria_aprovada ||
      row.franquia_aprovada_pt_br ||
      row.nome_aprovado_pt_br,
  );
}

function buildGroups(rows, existing) {
  const groups = new Map();

  for (const row of rows) {
    const key = groupKey(row);
    const current =
      groups.get(key) ||
      {
        rows: [],
        categoria_atual: row.categoria_final,
        franquia_sugerida_pt_br: row.sugestao_franquia_pt_br,
        nome_sugerido_pt_br: row.sugestao_nome_pt_br,
      };
    current.rows.push(row);
    groups.set(key, current);
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const previous = existing.get(key) || {};
      const preserveManual = hasManualGroupDecision(previous);
      const quantidade = group.rows.length;
      const categoriaSugerida = categorySuggestion(group.categoria_atual);
      const examples = group.rows.slice(0, 5);
      const draft = {
        quantidade,
        categoria_atual: group.categoria_atual,
        categoria_sugerida: categoriaSugerida,
        franquia_sugerida_pt_br: group.franquia_sugerida_pt_br,
        nome_sugerido_pt_br: group.nome_sugerido_pt_br,
      };
      const priority = priorityFor(draft);

      return {
        status_grupo: previous.status_grupo || "needs_review",
        prioridade: preserveManual ? previous.prioridade || priority.prioridade : priority.prioridade,
        motivo_prioridade: preserveManual
          ? previous.motivo_prioridade || priority.motivo
          : priority.motivo,
        quantidade,
        categoria_atual: group.categoria_atual,
        categoria_sugerida: categoriaSugerida,
        categoria_aprovada: previous.categoria_aprovada || "",
        franquia_sugerida_pt_br: group.franquia_sugerida_pt_br,
        franquia_aprovada_pt_br: previous.franquia_aprovada_pt_br || "",
        nome_sugerido_pt_br: group.nome_sugerido_pt_br,
        nome_aprovado_pt_br: previous.nome_aprovado_pt_br || "",
        aliases_sugeridos: uniq(group.rows.flatMap((row) => row.aliases.split(/;\s*/))).join("; "),
        tags_publicas_sugeridas: uniq(
          group.rows.flatMap((row) => row.tags_publicas.split(/;\s*/)),
        ).join("; "),
        exemplo_source: group.rows[0]?.source_name || "",
        exemplo_display: group.rows[0]?.display_relpath || "",
        exemplos_sources: examples.map((row) => row.source_name).join("; "),
        exemplos_display: examples.map((row) => row.display_relpath).join("; "),
        chave_grupo: key,
      };
    })
    .sort((left, right) => {
      const priorityOrder = { alta: 0, media: 1, baixa: 2 };
      return (
        priorityOrder[left.prioridade] - priorityOrder[right.prioridade] ||
        right.quantidade - left.quantidade ||
        left.categoria_atual.localeCompare(right.categoria_atual) ||
        left.nome_sugerido_pt_br.localeCompare(right.nome_sugerido_pt_br)
      );
    });
}

async function writeCsv(filePath, rows) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const csv = [
    COLUMNS.join(","),
    ...rows.map((row) => COLUMNS.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n");
  await fs.writeFile(filePath, `${csv}\n`, "utf8");
}

async function main() {
  const rows = await readCsv(QUEUE);
  const existing = await readExistingGroups();
  const groups = buildGroups(rows, existing);
  await writeCsv(GROUPS, groups);

  const summary = {
    generated_at: new Date().toISOString(),
    queue: QUEUE,
    groups_csv: GROUPS,
    rows: rows.length,
    groups: groups.length,
    by_priority: Object.fromEntries(
      ["alta", "media", "baixa"].map((priority) => [
        priority,
        groups.filter((group) => group.prioridade === priority).length,
      ]),
    ),
    by_category_suggestion: groups.reduce((acc, group) => {
      acc[group.categoria_sugerida] = (acc[group.categoria_sugerida] || 0) + group.quantidade;
      return acc;
    }, {}),
    top_groups: groups.slice(0, 40),
  };

  await fs.writeFile(SUMMARY, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        queue: QUEUE,
        groups: GROUPS,
        summary: SUMMARY,
        rows: rows.length,
        groups_count: groups.length,
        by_priority: summary.by_priority,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
