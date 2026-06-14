import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function normalizeTag(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const GENERIC_TAGS = new Set([
  "anime",
  "busto",
  "conjunto",
  "conjuntos",
  "criaturas",
  "deuses",
  "diorama",
  "dragon ball",
  "dragon ball gt",
  "dragon ball super",
  "dragon ball z",
  "figura",
  "forca ginyu",
  "freeza force",
  "game",
  "ginyu",
  "gt",
  "majins",
  "miniatura",
  "namekusei",
  "nsfw",
  "oozaru",
  "painel",
  "raca do freeza",
  "robos",
  "sayajin",
  "sayajins",
  "saiyajins",
  "terraqueo",
  "tropa do orgulho",
  "viloes",
]);

const OPERATIONAL_PATTERNS = [
  /^busto\b/i,
  /^painel\b/i,
  /^conjunto\b/i,
  /\bvs\b/i,
  /\be\b/i,
  /,/,
];

function isOperationalCharacterName(value) {
  const text = String(value || "").trim();
  return Boolean(text) && OPERATIONAL_PATTERNS.some((pattern) => pattern.test(text));
}

function suggestAliases(row) {
  const rawTags = Array.isArray(row.tags) ? row.tags : [];
  const aliases = [];

  for (const tag of rawTags) {
    const normalized = normalizeTag(tag);
    if (!normalized) continue;
    if (GENERIC_TAGS.has(normalized)) continue;
    if (normalized === normalizeTag(row.character_name)) continue;
    if (normalized === normalizeTag(row.source_title)) continue;
    if (aliases.includes(normalized)) continue;
    aliases.push(normalized);
  }

  return aliases;
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));

  const url = process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase credentials in environment.");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  let from = 0;
  const pageSize = 1000;
  const rows = [];

  while (true) {
    const { data, error } = await supabase
      .from("models")
      .select("id,source_title,character_name,variant_name,tags,image_path,is_active,catalog_visibility")
      .eq("is_active", true)
      .in("catalog_visibility", ["general", "both"])
      .not("image_path", "is", null)
      .ilike("image_path", "catalog-webp-final/display/%")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  const flagged = rows
    .filter((row) => isOperationalCharacterName(row.character_name))
    .map((row) => ({
      id: row.id,
      source_title: row.source_title,
      character_name: row.character_name,
      variant_name: row.variant_name,
      image_path: row.image_path,
      suggested_aliases: suggestAliases(row),
      tags: Array.isArray(row.tags) ? row.tags : [],
    }))
    .sort((left, right) =>
      String(left.character_name).localeCompare(String(right.character_name), "pt-BR"),
    );

  console.log(JSON.stringify({ total_rows: rows.length, flagged }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
