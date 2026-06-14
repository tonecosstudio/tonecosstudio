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

function loadAliasOverrideKeys() {
  const filePath = path.join(
    process.cwd(),
    "src",
    "config",
    "catalog-character-presentation.ts",
  );

  if (!fs.existsSync(filePath)) return new Set();

  const content = fs.readFileSync(filePath, "utf8");
  const marker = "export const CATALOG_CHARACTER_PRESENTATION_ALIAS_OVERRIDES";
  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) return new Set();

  const objectStart = content.indexOf("{", markerIndex);
  if (objectStart === -1) return new Set();

  let depth = 0;
  let objectEnd = -1;
  for (let index = objectStart; index < content.length; index += 1) {
    const char = content[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        objectEnd = index;
        break;
      }
    }
  }

  if (objectEnd === -1) return new Set();

  const objectLiteral = content.slice(objectStart, objectEnd + 1);
  const keys = new Set();
  const regex = /"([^"]+::[^"]+)":/g;
  let match;

  while ((match = regex.exec(objectLiteral))) {
    keys.add(normalizeTag(match[1]));
  }

  return keys;
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

function getAliasOverrideLookupKey(row) {
  return normalizeTag(`${row.source_title || ""}::${row.character_name || ""}`);
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  const aliasOverrideKeys = loadAliasOverrideKeys();

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
      covered_by_alias_override: aliasOverrideKeys.has(
        getAliasOverrideLookupKey(row),
      ),
      suggested_aliases: suggestAliases(row),
      tags: Array.isArray(row.tags) ? row.tags : [],
    }))
    .sort((left, right) =>
      String(left.character_name).localeCompare(String(right.character_name), "pt-BR"),
    );

  const covered = flagged.filter((row) => row.covered_by_alias_override);
  const uncovered = flagged.filter((row) => !row.covered_by_alias_override);

  console.log(
    JSON.stringify(
      {
        total_rows: rows.length,
        flagged_total: flagged.length,
        covered_by_alias_override: covered.length,
        uncovered_total: uncovered.length,
        uncovered,
        covered,
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
