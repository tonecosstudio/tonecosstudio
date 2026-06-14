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

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function titleCaseWords(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function loadAliasOverrides() {
  const filePath = path.join(
    process.cwd(),
    "src",
    "config",
    "catalog-character-presentation.ts",
  );

  if (!fs.existsSync(filePath)) return new Map();

  const content = fs.readFileSync(filePath, "utf8");
  const marker = "export const CATALOG_CHARACTER_PRESENTATION_ALIAS_OVERRIDES";
  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) return new Map();

  const objectStart = content.indexOf("{", markerIndex);
  if (objectStart === -1) return new Map();

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

  if (objectEnd === -1) return new Map();

  const objectLiteral = content.slice(objectStart, objectEnd + 1);
  const overrides = new Map();
  const entryRegex = /"([^"]+::[^"]+)":\s*\[((?:.|\r|\n)*?)\]/g;
  let entryMatch;

  while ((entryMatch = entryRegex.exec(objectLiteral))) {
    const lookupKey = normalizeText(entryMatch[1]);
    const aliases = [];
    const itemRegex = /\{\s*key:\s*"([^"]+)"(?:,\s*label:\s*"([^"]+)")?\s*\}/g;
    let itemMatch;

    while ((itemMatch = itemRegex.exec(entryMatch[2]))) {
      aliases.push({
        key: normalizeText(itemMatch[1]),
        label: itemMatch[2] || itemMatch[1],
      });
    }

    if (aliases.length) overrides.set(lookupKey, aliases);
  }

  return overrides;
}

const GENERIC_TAGS = new Set([
  "anime",
  "android",
  "androids",
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

const CHARACTER_PRESENTATION_BLOCKLIST = new Set([
  ...GENERIC_TAGS,
  "mascara",
  "dupla",
  "modelo",
  "modelos",
]);

const CHARACTER_WRAPPER_PREFIXES = [/^busto\s+/i, /^painel\s+/i, /^conjunto\s+/i];

function isOperationalCharacterName(value) {
  const text = String(value || "").trim();
  return (
    /^busto\b/i.test(text) ||
    /^painel\b/i.test(text) ||
    /^conjunto\b/i.test(text) ||
    /\bvs\b/i.test(text) ||
    /\be\b/i.test(text) ||
    /,/.test(text)
  );
}

function stripCharacterPresentationWrappers(value) {
  let next = String(value || "").trim();
  for (const pattern of CHARACTER_WRAPPER_PREFIXES) {
    next = next.replace(pattern, "");
  }
  return next.trim();
}

function splitCharacterPresentationCandidates(value) {
  return String(value || "")
    .split(/\s+(?:vs|versus|x|e)\s+|,/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isAliasCandidate(value, sourceTitle) {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  if (CHARACTER_PRESENTATION_BLOCKLIST.has(normalized)) return false;
  if (/^(?:busto|painel|conjunto)(?:\s|-)/.test(normalized)) return false;

  const normalizedSource = normalizeText(sourceTitle);
  if (normalizedSource && normalized === normalizedSource) return false;
  if (normalizedSource && normalized.includes(normalizedSource)) return false;

  return true;
}

function getSuggestedAliasesFromTags(row) {
  const tags = Array.isArray(row.tags) ? row.tags : [];
  const aliases = [];

  for (const tag of tags) {
    const normalized = normalizeText(tag);
    if (!normalized) continue;
    if (GENERIC_TAGS.has(normalized)) continue;
    if (normalized === normalizeText(row.character_name)) continue;
    if (normalized === normalizeText(row.source_title)) continue;
    if (aliases.includes(normalized)) continue;
    aliases.push(normalized);
  }

  return aliases;
}

function deriveAliases(row, aliasOverrides) {
  const lookupKey = normalizeText(
    `${row.source_title || ""}::${row.character_name || ""}`,
  );
  const overridden = aliasOverrides.get(lookupKey);
  if (overridden?.length) {
    return overridden.map((alias) => ({
      key: alias.key,
      label: alias.label || titleCaseWords(alias.key),
    }));
  }

  const aliases = new Map();
  const pushAlias = (rawValue, preferredLabel) => {
    const normalized = normalizeText(rawValue);
    if (!isAliasCandidate(normalized, row.source_title)) return;
    if (aliases.has(normalized)) return;
    aliases.set(normalized, preferredLabel?.trim() || titleCaseWords(normalized));
  };

  const rawCharacterName = String(row.character_name || "").trim();
  const stripped = stripCharacterPresentationWrappers(rawCharacterName);
  const splitParts = splitCharacterPresentationCandidates(stripped);
  const operational =
    stripped !== rawCharacterName || splitParts.length > 1 || isOperationalCharacterName(rawCharacterName);

  if (operational) {
    for (const tag of getSuggestedAliasesFromTags(row)) {
      pushAlias(tag, titleCaseWords(tag));
    }
  }

  if (splitParts.length > 1) {
    for (const part of splitParts) {
      pushAlias(part, part);
    }
  } else if (stripped) {
    pushAlias(stripped, stripped);
  }

  if (aliases.size === 0 && row.character_name) {
    pushAlias(row.character_name, row.character_name);
  }

  return Array.from(aliases.entries()).map(([key, label]) => ({ key, label }));
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  const aliasOverrides = loadAliasOverrides();

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
      .select(
        "id,source_title,character_name,variant_name,tags,image_path,is_active,catalog_visibility",
      )
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

  const grouped = new Map();

  for (const row of rows) {
    const aliases = deriveAliases(row, aliasOverrides);
    for (const alias of aliases) {
      const groupKey = `${normalizeText(row.source_title)}::${alias.key}`;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          source_title: row.source_title,
          character_key: alias.key,
          character_label: alias.label,
          model_count: 0,
          raw_character_names: new Set(),
          variant_names: new Set(),
          sample_paths: [],
          operational_raw_names: new Set(),
        });
      }

      const group = grouped.get(groupKey);
      group.model_count += 1;
      if (row.character_name) group.raw_character_names.add(row.character_name);
      if (row.variant_name) group.variant_names.add(row.variant_name);
      if (
        row.character_name &&
        isOperationalCharacterName(row.character_name)
      ) {
        group.operational_raw_names.add(row.character_name);
      }
      if (group.sample_paths.length < 5 && row.image_path) {
        group.sample_paths.push(row.image_path);
      }
    }
  }

  const summary = Array.from(grouped.values())
    .map((group) => ({
      source_title: group.source_title,
      character_key: group.character_key,
      character_label: group.character_label,
      model_count: group.model_count,
      raw_character_name_count: group.raw_character_names.size,
      variant_name_count: group.variant_names.size,
      raw_character_names: Array.from(group.raw_character_names).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
      operational_raw_names: Array.from(group.operational_raw_names).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
      sample_paths: group.sample_paths,
    }))
    .sort((left, right) => {
      if (right.model_count !== left.model_count) {
        return right.model_count - left.model_count;
      }
      return String(left.character_label).localeCompare(
        String(right.character_label),
        "pt-BR",
      );
    });

  const suspicious = summary.filter(
    (group) =>
      group.operational_raw_names.length > 0 || group.raw_character_name_count > 3,
  );

  console.log(
    JSON.stringify(
      {
        total_rows: rows.length,
        total_character_pages: summary.length,
        suspicious_count: suspicious.length,
        top_character_pages: summary.slice(0, 25),
        suspicious_character_pages: suspicious.slice(0, 50),
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
