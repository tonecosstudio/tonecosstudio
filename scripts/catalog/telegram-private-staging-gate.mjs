// Autoridade compartilhada de isolamento da otimização privada do Telegram.
// Este módulo não aprova, publica nem altera imagens.
function canonicalCategory(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isPrivateCuradoriaRecord(record) {
  if (!record || typeof record !== "object") return false;

  if (record.private_staging_only === true) return true;
  if (record.status === "prepared_private") return true;
  if (record.curation_status === "private_not_authorized") return true;

  // Registros legados (primeiro lote WebP) não possuíam a flag.
  // A origem imutável continua sendo suficiente para bloqueá-los.
  const originalPath = String(record.original_catalog_relpath ?? record.catalog_relpath ?? "")
    .replaceAll("\\", "/")
    .toLowerCase();
  if (originalPath.split("/").includes("curadoria-privada")) return true;

  return [record.source_category, record.final_category, record.category]
    .some((value) => canonicalCategory(value) === "curadoria privada");
}
