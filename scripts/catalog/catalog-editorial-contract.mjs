/**
 * Staged commercial catalog editorial patcher for the canonical TONART repo.
 * Pure, offline and side-effect free. The Git-owned review baseline is not
 * a live publisher until explicit M5 handoff. The deployed D1 remains the
 * authority for current public reads. Never writes D1, R2 or Supabase.
 */
export class EditorialReviewError extends Error {
  constructor(code, status = 422) {
    super(code);
    this.name = "EditorialReviewError";
    this.status = status;
  }
}

const MODEL_ID = /^mdl_[a-f0-9]{20}$/;
const FIELDS = new Set([
  "id", "slug", "code", "name", "variantName",
  "category", "franchise", "newName", "newVariant",
]);

function fail(code, status = 422) {
  throw new EditorialReviewError(code, status);
}

function label(value, original, max) {
  if (value === "") return null;
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value)) {
    fail("invalid_editorial_label");
  }
  const text = value.trim();
  if (!text || Array.from(text).length > max ||
      /^[=+@-]/.test(text) || /[<>]/.test(text)) {
    fail("invalid_editorial_label");
  }
  return text === original ? null : text;
}

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function patchModelBlock(text, modelId, originalModel, replacement) {
  const needle = '      "id": ' + JSON.stringify(modelId) + ",";
  if (countOccurrences(text, needle) !== 1) fail("editorial_contract_layout_changed", 409);
  const position = text.indexOf(needle);
  const start = text.lastIndexOf("\n    {", position);
  const end = text.indexOf("\n    }", position);
  if (start < 0 || end < 0) fail("editorial_contract_layout_changed", 409);
  const first = start + 1;
  const last = end + "\n    }".length;
  let block = text.slice(first, last);
  if (JSON.parse(block).id !== modelId) fail("editorial_contract_layout_changed", 409);

  for (const [field, newText] of Object.entries(replacement)) {
    const oldLine = '      "' + field + '": ' + JSON.stringify(originalModel[field]);
    const nextLine = '      "' + field + '": ' + JSON.stringify(newText);
    if (countOccurrences(block, oldLine) !== 1) fail("editorial_contract_layout_changed", 409);
    block = block.replace(oldLine, nextLine);
  }
  return text.slice(0, first) + block + text.slice(last);
}

/** Only an exact snapshot of a published model may be changed. */
export function patchCanonicalEditorialContract(original, edits) {
  if (typeof original !== "string" || !Array.isArray(edits) ||
      edits.length < 1 || edits.length > 12) {
    fail("editorial_page_size_invalid");
  }
  let contract;
  try { contract = JSON.parse(original); } catch { fail("editorial_contract_invalid", 409); }
  if (contract?.version !== 1 || !Array.isArray(contract.models) ||
      contract.source?.productionModels !== contract.models.length) {
    fail("editorial_contract_invalid", 409);
  }
  const published = contract.models.filter((item) => item.published === true || item.published === 1);
  if (published.length !== contract.source.publishedModels) {
    fail("editorial_contract_invalid", 409);
  }
  const byId = new Map(contract.models.map((model) => [model.id, model]));
  if (byId.size !== contract.models.length) fail("editorial_contract_invalid", 409);

  const seen = new Set();
  const planned = new Map();
  for (const edit of edits) {
    if (!edit || typeof edit !== "object" || Array.isArray(edit) ||
        Object.keys(edit).some((field) => !FIELDS.has(field)) ||
        !MODEL_ID.test(edit.id) || seen.has(edit.id)) {
      fail("editorial_request_invalid");
    }
    seen.add(edit.id);
    const current = byId.get(edit.id);
    if (!current || !(current.published === 1 || current.published === true)) {
      fail("editorial_model_not_published", 409);
    }
    const expected = {
      slug: current.slug, code: current.code,
      name: current.displayName, variantName: current.variantName,
      category: current.categoryName, franchise: current.franchiseName,
    };
    if (Object.entries(expected).some(([key, value]) =>
      typeof edit[key] !== "string" || edit[key] !== value)) {
      fail("editorial_stale_model_snapshot", 409);
    }
    const update = {};
    const name = label(edit.newName ?? "", current.displayName, 120);
    const variant = label(edit.newVariant ?? "", current.variantName, 160);
    if (name !== null) update.displayName = name;
    if (variant !== null) update.variantName = variant;
    if (Object.keys(update).length) planned.set(edit.id, update);
  }
  if (!planned.size) fail("editorial_nothing_to_change");

  const identifiers = new Map();
  const keyFor = (row, update) => JSON.stringify([
    row.categorySlug, row.franchiseSlug, row.folderPathKey,
    (update?.displayName ?? row.displayName).toLocaleLowerCase("und"),
    (update?.variantName ?? row.variantName).toLocaleLowerCase("und"),
  ]);
  // Existing unrelated collisions do not block a bounded correction.
  for (const row of published) {
    const key = keyFor(row, planned.get(row.id));
    if (identifiers.has(key) && (planned.has(row.id) ||
        planned.has(identifiers.get(key)))) {
      fail("editorial_public_name_collision", 409);
    }
    identifiers.set(key, row.id);
  }
  let updated = original;
  for (const id of [...planned.keys()].sort()) {
    updated = patchModelBlock(updated, id, byId.get(id), planned.get(id));
  }
  let parsed;
  try { parsed = JSON.parse(updated); } catch { fail("editorial_contract_invalid", 409); }
  if (parsed.models.length !== contract.models.length ||
      parsed.source.productionModels !== contract.source.productionModels ||
      parsed.source.publishedModels !== contract.source.publishedModels) {
    fail("editorial_contract_integrity_failed", 409);
  }
  return { content: updated, ids: [...planned.keys()].sort() };
}
