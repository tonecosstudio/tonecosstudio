import fs from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function readEnvFile(path) {
  const text = fs.readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
  }
  return env;
}

const env = readEnvFile(".env");
const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data, error } = await supabase
  .from("models")
  .select(
    "id,source_title,character_name,variant_name,image_path,catalog_visibility,is_active,duplicate_status,duplicate_of_model_id",
  )
  .eq("is_active", true)
  .in("catalog_visibility", ["general", "both"]);

if (error) throw error;

const rows = data ?? [];
const summary = {
  total: rows.length,
  finalDisplay: 0,
  staging: 0,
  import: 0,
  other: 0,
  markedDuplicates: 0,
};

const finalizedRows = [];
for (const row of rows) {
  const path = String(row.image_path || "");
  const isMarkedDuplicate =
    Boolean(row.duplicate_of_model_id) && row.duplicate_status !== "unique";

  if (isMarkedDuplicate) summary.markedDuplicates += 1;

  if (path.startsWith("catalog-webp-final/display/")) {
    summary.finalDisplay += 1;
    if (!isMarkedDuplicate) finalizedRows.push(row);
  } else if (path.startsWith("catalog-staging/")) {
    summary.staging += 1;
  } else if (path.startsWith("catalog-import/")) {
    summary.import += 1;
  } else {
    summary.other += 1;
  }
}

const byHash = new Map();
for (const row of finalizedRows) {
  const url = `https://ordax.com.br/${String(row.image_path).replace(/^\/+/, "")}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar asset: ${response.status} ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const bucket = byHash.get(hash);
  if (bucket) bucket.push(row);
  else byHash.set(hash, [row]);
}

const duplicateHashes = Array.from(byHash.entries())
  .filter(([, items]) => items.length > 1)
  .map(([hash, items]) => ({
    hash,
    count: items.length,
    items: items.map((item) => ({
      id: item.id,
      source_title: item.source_title,
      character_name: item.character_name,
      variant_name: item.variant_name,
      image_path: item.image_path,
    })),
  }));

console.log(
  JSON.stringify(
    {
      summary,
      checkedFinalDisplayRows: finalizedRows.length,
      duplicateHashGroups: duplicateHashes.length,
      duplicates: duplicateHashes,
    },
    null,
    2,
  ),
);
