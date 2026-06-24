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
const SEQUENCES = path.resolve(
  argValue("sequences", path.join(MANIFESTS_DIR, "sequencias_telegram_ptbr.csv")),
);
const SUMMARY = path.resolve(
  argValue("summary", path.join(MANIFESTS_DIR, "resumo_sequencias_telegram_ptbr.json")),
);

const COLUMNS = [
  "sequencia_id",
  "quantidade",
  "categoria_final",
  "franquia",
  "pasta_modelo",
  "nome_sugerido_pt_br",
  "inicio_source",
  "fim_source",
  "inicio_message_id",
  "fim_message_id",
  "exemplos_display",
  "status_sequencia",
  "observacoes",
];

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

function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceTimestamp(sourceName) {
  const match = String(sourceName || "").match(/^(\d{8})_(\d{6})/);
  if (!match) return 0;
  const [, date, time] = match;
  return Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(4, 6)) - 1,
    Number(date.slice(6, 8)),
    Number(time.slice(0, 2)),
    Number(time.slice(2, 4)),
    Number(time.slice(4, 6)),
  );
}

function modelKey(row) {
  return [
    row.categoria_final,
    row.sugestao_franquia_pt_br || row.source_franchise,
    row.source_folder || row.nome_original || row.sugestao_nome_pt_br,
  ]
    .map(normalizeComparable)
    .join("|");
}

function makeSequence(id, rows) {
  const first = rows[0];
  const last = rows.at(-1);

  return {
    sequencia_id: `seq-${String(id).padStart(5, "0")}`,
    quantidade: rows.length,
    categoria_final: first.categoria_final,
    franquia: first.sugestao_franquia_pt_br || first.source_franchise,
    pasta_modelo: first.source_folder || first.nome_original,
    nome_sugerido_pt_br: first.sugestao_nome_pt_br,
    inicio_source: first.source_name,
    fim_source: last.source_name,
    inicio_message_id: first.message_id,
    fim_message_id: last.message_id,
    exemplos_display: rows
      .slice(0, 6)
      .map((row) => row.display_relpath)
      .join("; "),
    status_sequencia: "needs_review",
    observacoes: "",
  };
}

async function main() {
  const rows = (await readCsv(QUEUE))
    .map((row) => ({
      ...row,
      _timestamp: sourceTimestamp(row.source_name),
      _message: Number.parseInt(row.message_id || "0", 10),
      _modelKey: modelKey(row),
    }))
    .sort(
      (left, right) =>
        left._timestamp - right._timestamp ||
        left._message - right._message ||
        left.source_name.localeCompare(right.source_name),
    );

  const sequences = [];
  let current = [];

  for (const row of rows) {
    const previous = current.at(-1);
    const sameModel = previous && previous._modelKey === row._modelKey;
    const closeMessage =
      previous && Number.isFinite(row._message) && row._message - previous._message <= 12;
    const closeTime = previous && row._timestamp - previous._timestamp <= 20_000;

    if (!previous || (sameModel && (closeMessage || closeTime))) {
      current.push(row);
      continue;
    }

    sequences.push(makeSequence(sequences.length + 1, current));
    current = [row];
  }

  if (current.length > 0) sequences.push(makeSequence(sequences.length + 1, current));

  const csv = [
    COLUMNS.join(","),
    ...sequences.map((row) => COLUMNS.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n");

  await fs.writeFile(SEQUENCES, `${csv}\n`, "utf8");

  const summary = {
    generated_at: new Date().toISOString(),
    queue: QUEUE,
    sequences: SEQUENCES,
    rows: rows.length,
    sequence_count: sequences.length,
    multi_item_sequences: sequences.filter((sequence) => sequence.quantidade > 1).length,
    largest_sequences: sequences
      .slice()
      .sort((left, right) => right.quantidade - left.quantidade)
      .slice(0, 40),
  };

  await fs.writeFile(SUMMARY, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        rows: rows.length,
        sequences: sequences.length,
        multi_item_sequences: summary.multi_item_sequences,
        sequences_csv: SEQUENCES,
        summary: SUMMARY,
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
