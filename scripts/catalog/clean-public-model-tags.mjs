import fs from "node:fs/promises";
import path from "node:path";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: false, quiet: true });
loadEnv({ path: ".env", override: false, quiet: true });

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

const ROOT = process.cwd();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = argFlag("dry-run") || process.env.DRY_RUN === "true";
const INCLUDE_ALL_MODELS =
  argFlag("all") || process.env.CATALOG_TAG_CLEAN_ALL === "true";
const REPORT_PATH = argValue(
  "report",
  process.env.CATALOG_TAG_CLEAN_REPORT_PATH ||
    "tmp/catalog-public-tag-clean-report.json",
);
const LIMIT = Number.parseInt(argValue("limit", "5000"), 10);
const catalogTagPolicy = JSON.parse(
  readFileSync(
    path.join(ROOT, "src", "config", "catalog-tag-policy.json"),
    "utf8",
  ),
);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
  );
}

if (!Number.isFinite(LIMIT) || LIMIT < 1) {
  throw new Error("--limit must be a positive integer.");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const INTERNAL_TAG_PREFIXES = catalogTagPolicy.internalTagPrefixes;
const INTERNAL_TAGS = new Set(catalogTagPolicy.internalTags);
const PUBLIC_TAG_ALIASES = catalogTagPolicy.publicTagAliases || {};
const PUBLIC_TAG_BLOCKLIST = new Set(catalogTagPolicy.publicTagBlocklist || []);

function cleanName(value) {
  return String(value || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTag(value) {
  const normalized = cleanName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();

  return PUBLIC_TAG_ALIASES[normalized] || normalized;
}

function isInternalTag(tag) {
  const canonicalTag = normalizeTag(tag).replace(/\s+/g, "-");
  return (
    INTERNAL_TAGS.has(canonicalTag) ||
    INTERNAL_TAG_PREFIXES.some((prefix) => canonicalTag.startsWith(prefix))
  );
}

function normalizePublicTags(tags, limit = 20) {
  return Array.from(
    new Set(
      tags
        .map((tag) => normalizeTag(tag))
        .filter(Boolean)
        .filter((tag) => !isInternalTag(tag))
        .filter((tag) => !PUBLIC_TAG_BLOCKLIST.has(tag)),
    ),
  ).slice(0, limit);
}

function buildPublicTags(model) {
  const sourceName = model.source_title || model.franchise;
  const characterName =
    model.character_name ||
    String(model.name || "")
      .replace(/\s+\([^)]+\)\s*$/, "")
      .trim();
  const candidates = [
    sourceName,
    characterName,
    model.source_type === "anime" ? "anime" : model.source_type,
    model.category,
    model.subcategory,
    ...(model.tags || []),
  ];

  const tags = normalizePublicTags(candidates, 20);
  return tags.length > 0 ? tags : normalizePublicTags([model.name], 20);
}

function arraysEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

async function fetchModels() {
  let query = supabase
    .from("models")
    .select(
      "id,name,is_active,franchise,category,subcategory,tags,character_name,variant_name,source_title,source_type,catalog_visibility,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (!INCLUDE_ALL_MODELS) {
    query = query
      .eq("is_active", true)
      .in("catalog_visibility", ["general", "both"]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function updateModelTags(model, tags) {
  const { error } = await supabase
    .from("models")
    .update({ tags, updated_at: new Date().toISOString() })
    .eq("id", model.id);
  if (error) throw error;
}

const models = await fetchModels();
const changes = models
  .map((model) => ({
    id: model.id,
    name: model.name,
    before: model.tags || [],
    after: buildPublicTags(model),
  }))
  .filter((change) => !arraysEqual(change.before, change.after));

const failed = [];
if (!DRY_RUN) {
  for (const change of changes) {
    try {
      await updateModelTags(change, change.after);
    } catch (error) {
      failed.push({
        id: change.id,
        name: change.name,
        error: error instanceof Error ? error.message : JSON.stringify(error),
      });
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  dryRun: DRY_RUN,
  scope: INCLUDE_ALL_MODELS ? "all" : "public",
  analyzed: models.length,
  changed: changes.length,
  failed: failed.length,
  changes,
  failedUpdates: failed,
};

await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      dryRun: DRY_RUN,
      scope: report.scope,
      analyzed: report.analyzed,
      changed: report.changed,
      failed: report.failed,
      report: REPORT_PATH,
    },
    null,
    2,
  ),
);

if (failed.length > 0) process.exitCode = 1;
