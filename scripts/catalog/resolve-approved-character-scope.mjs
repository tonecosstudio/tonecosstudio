/**
 * Resolve approved private character exports to EXISTING D1 model/franchise IDs.
 * Pure, offline preflight: no SQL writes, network requests, approval, or publication.
 * The private export provides a franchise label, not a category-scoped D1 key.
 * Resolve scope ONLY through reviewed model IDs; never guess from a label.
 */
const SOURCE = 'public.admin_export_approved_catalog_character_projection';

function requireValid(condition, code) {
  if (!condition) throw new Error(code);
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function label(value) {
  return typeof value === 'string' && value.trim().length > 0 &&
    value.normalize('NFC').trim().toLocaleLowerCase('pt-BR');
}

function validText(value, max = 240) {
  return typeof value === 'string' && value.trim() === value &&
    value.length > 0 && value.length <= max;
}

function validDate(value) {
  return typeof value === 'string' && value.length <= 64 &&
    Number.isFinite(Date.parse(value));
}

function distinctRows(rows, key, error) {
  const result = new Map();
  for (const row of rows) {
    requireValid(record(row) && key(row) !== null && !result.has(key(row)), error);
    result.set(key(row), row);
  }
  return result;
}

/**
 * @param {unknown} exportPayload An explicit human-approved Supabase export.
 * @param {{franchises: unknown[], models: unknown[]}} d1Snapshot Read-only D1 rows:
 *   franchises: {id, name}; models: {id, slug, franchise_id, published}.
 * @returns {Array<{identityId: string, slug: string, franchiseId: number,
 *   approvalRef: string, modelIds: string[]}>}
 */
export function resolveApprovedCharacterScopes(exportPayload, d1Snapshot) {
  requireValid(record(exportPayload) &&
    exportPayload.schemaVersion === 1 &&
    exportPayload.source === SOURCE &&
    validDate(exportPayload.generatedAt) &&
    Array.isArray(exportPayload.characters) &&
    exportPayload.characters.length <= 2609,
  'character_export_contract_invalid');
  requireValid(record(d1Snapshot) &&
    Array.isArray(d1Snapshot.franchises) &&
    Array.isArray(d1Snapshot.models) &&
    d1Snapshot.franchises.length <= 10000 &&
    d1Snapshot.models.length <= 20000,
  'd1_scope_snapshot_invalid');

  const franchises = distinctRows(d1Snapshot.franchises, row =>
    Number.isSafeInteger(row.id) && row.id > 0 && label(row.name) ? row.id : null,
  'd1_franchise_identity_invalid');
  const models = distinctRows(d1Snapshot.models, row =>
    validText(row.id, 160) && validText(row.slug) &&
    Number.isSafeInteger(row.franchise_id) &&
    [0, 1, true, false].includes(row.published) ? row.id : null,
  'd1_model_identity_invalid');
  for (const model of models.values()) {
    requireValid(franchises.has(model.franchise_id), 'd1_model_franchise_missing');
  }

  const seenCharacters = new Set();
  return exportPayload.characters.map(character => {
    requireValid(record(character) &&
      validText(character.identityId, 120) &&
      validText(character.slug) &&
      validText(character.franchiseName) &&
      validText(character.approvalRef) &&
      validDate(character.reviewedAt) &&
      validDate(character.approvedAt) &&
      Number.isSafeInteger(character.profileRevision) &&
      character.profileRevision >= 0 &&
      record(character.profile) &&
      character.profile.slug === character.slug &&
      Array.isArray(character.modelLinks) &&
      character.modelLinks.length > 0 &&
      character.modelLinks.length <= 2609 &&
      !seenCharacters.has(character.identityId),
    'approved_character_scope_invalid');
    seenCharacters.add(character.identityId);

    const seenModels = new Set();
    const franchiseIds = new Set();
    const modelIds = [];
    for (const link of character.modelLinks) {
      requireValid(record(link) &&
        validText(link.modelId, 160) &&
        validText(link.modelSlug) &&
        validText(link.evidenceTitle) &&
        validText(link.evidenceUrl, 2000) &&
        !seenModels.has(link.modelId),
      'approved_character_model_link_invalid');
      let url;
      try { url = new URL(link.evidenceUrl); } catch { /* handled below */ }
      requireValid(url?.protocol === 'https:' && !url.username && !url.password,
        'approved_character_model_evidence_invalid');
      seenModels.add(link.modelId);
      const model = models.get(link.modelId);
      requireValid(model && model.slug === link.modelSlug,
        'approved_character_model_identity_mismatch');
      requireValid(model.published === true || model.published === 1,
        'approved_character_model_not_public');
      franchiseIds.add(model.franchise_id);
      modelIds.push(model.id);
    }

    // One character may have many models; the current public profile has
    // precisely one universe. A crossover needs explicit editorial resolution.
    requireValid(franchiseIds.size === 1,
      'approved_character_franchise_ambiguous');
    const franchiseId = [...franchiseIds][0];
    requireValid(label(franchises.get(franchiseId).name) ===
      label(character.franchiseName), 'approved_character_franchise_mismatch');
    return {
      identityId: character.identityId,
      slug: character.slug,
      franchiseId,
      approvalRef: character.approvalRef,
      modelIds: modelIds.sort(),
    };
  });
}
