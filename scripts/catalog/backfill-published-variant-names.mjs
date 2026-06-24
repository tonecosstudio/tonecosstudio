import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function parseEnvFile(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)="([^"]*)"$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyComparable(value) {
  return normalizeComparable(value).replace(/\s+/g, "-");
}

function titleCaseWords(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const PHRASE_LABELS = {
  "final form": "Forma Final",
  throne: "No Trono",
  "figura pair": "Dupla",
  pair: "Dupla",
  "mecha figura": "Mecha",
  "wall figura": "Painel",
  "blue suit figura": "Blue Suit",
  "green outfit figura": "Green Outfit",
  "tennis nsfw": "Tênis NSFW",
};

const GENERIC_VARIANT_WORDS = new Set([
  "figura",
  "estatua",
  "miniatura",
  "modelo",
  "pose",
  "versao",
  "versão",
  "default",
]);

function deriveVariantName({ characterName, imagePath }) {
  const normalizedPath = String(imagePath || "")
    .replaceAll("\\", "/")
    .toLowerCase();
  if (!normalizedPath) return null;

  const fileName = normalizedPath.split("/").pop() || "";
  const stem = fileName.replace(/\.[^.]+$/, "");
  if (!stem) return null;

  const withoutObjectId = stem.replace(/-\d+$/, "");
  const withoutAngle = withoutObjectId.replace(/-\d+$/, "");
  const productStem = withoutAngle || withoutObjectId || stem;
  const characterSlug = slugifyComparable(characterName);

  let remainder = productStem;
  if (characterSlug && remainder.startsWith(`${characterSlug}-`)) {
    remainder = remainder.slice(characterSlug.length + 1);
  } else if (characterSlug && remainder === characterSlug) {
    remainder = "";
  }

  if (!remainder) return null;

  const normalizedRemainder = remainder.replace(/-/g, " ").trim();
  if (!normalizedRemainder) return null;

  if (/^\d+$/.test(normalizedRemainder)) {
    return `Versao ${normalizedRemainder}`;
  }

  if (PHRASE_LABELS[normalizedRemainder]) {
    return PHRASE_LABELS[normalizedRemainder];
  }

  const meaningfulWords = normalizedRemainder
    .split(/\s+/)
    .filter((word) => word && !GENERIC_VARIANT_WORDS.has(word));

  if (meaningfulWords.length === 0) return null;
  if (
    meaningfulWords.length === 1 &&
    (meaningfulWords[0] === normalizeComparable(characterName) ||
      meaningfulWords[0].length <= 1)
  ) {
    return null;
  }

  return titleCaseWords(meaningfulWords.join(" "));
}

async function main() {
  const envPath = path.resolve(".env.local");
  const envValues = parseEnvFile(await fs.readFile(envPath, "utf8"));
  const supabase = createClient(
    envValues.VITE_SUPABASE_URL,
    envValues.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data, error } = await supabase
    .from("models")
    .select(
      "id,name,character_name,variant_name,source_title,image_path,is_active,catalog_visibility",
    )
    .eq("is_active", true)
    .in("catalog_visibility", ["general", "both"])
    .is("variant_name", null)
    .order("created_at", { ascending: true })
    .limit(2000);

  if (error) throw error;

  let updated = 0;
  for (const row of data ?? []) {
    const variantName = deriveVariantName({
      characterName: row.character_name || row.name,
      imagePath: row.image_path,
    });
    if (!variantName) continue;

    const { error: updateError } = await supabase
      .from("models")
      .update({ variant_name: variantName })
      .eq("id", row.id);
    if (updateError) throw updateError;
    updated += 1;
  }

  console.log(JSON.stringify({ scanned: data?.length || 0, updated }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
