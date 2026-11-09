/**
 * TONART visual MVP — single explicit permission list for public media.
 * All entries are digital renders of the exact registered sculpture/variant.
 * This module validates recorded evidence fields; it does NOT independently
 * prove that a third-party license or ownership claim is genuine.
 */
import manifest from "../../src/services/catalog/public-render-approvals.json" with { type: "json" };
import quarantine from "../../src/services/catalog/specialstl-quarantine.json" with { type: "json" };

const MODEL_ID = /^mdl_[0-9a-f]{16,40}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,239}$/;
const IMAGE_PATH = /^media\/(mdl_[0-9a-f]{16,40})\/(?:[a-zA-Z0-9._~-]+\/){1,16}(?:card|detail|thumb)\.(?:webp|png|jpe?g)$/;
const DRIVE_REF = /^drive:[A-Za-z0-9_-]{20,128}$/;
const EVIDENCE_REF = /^(?:drive:[A-Za-z0-9_-]{20,128}|repo:docs\/[A-Za-z0-9._\/-]{1,240})$/;

export function validatePublicRenderApprovals(data, restricted = quarantine) {
  if (!data || data.version !== 1 || !Array.isArray(data.approved) || data.approved.length > 250) {
    throw new Error("invalid_public_render_approval_manifest");
  }
  const blocked = new Map(restricted.confirmed.map((entry) => [entry.modelId, entry]));
  const ids = new Set();
  const slugs = new Set();
  const keys = new Set();
  for (const entry of data.approved) {
    if (!entry || !MODEL_ID.test(entry.modelId) || !SLUG.test(entry.slug) ||
      typeof entry.coverStorageKey !== "string" ||
      IMAGE_PATH.exec(entry.coverStorageKey)?.[1] !== entry.modelId ||
      /special[\s._-]*stl/i.test(entry.coverStorageKey) ||
      !["tonart-original-render", "authorized-third-party-render"].includes(entry.provenance) ||
      typeof entry.rightsHolder !== "string" || entry.rightsHolder.trim().length < 3 ||
      typeof entry.creatorCredit !== "string" || entry.creatorCredit.trim().length < 2 ||
      !DRIVE_REF.test(entry.sourceFileRef) || !EVIDENCE_REF.test(entry.rightsEvidenceRef) ||
      entry.sourceFileRef === entry.rightsEvidenceRef ||
      typeof entry.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sourceSha256) ||
      entry.publicationScope !== "tonartstudio.com.br" ||
      entry.ownerApproved !== true ||
      typeof entry.approvedOn !== "string" ||
      !/^20\d\d-\d\d-\d\d$/.test(entry.approvedOn)) {
      throw new Error("invalid_public_render_approval_entry");
    }
    if (ids.has(entry.modelId) || slugs.has(entry.slug) || keys.has(entry.coverStorageKey)) {
      throw new Error("duplicate_public_render_approval");
    }
    const held = blocked.get(entry.modelId);
    if (held && (
      held.replacement?.status !== "approved_authorized_render" ||
      held.replacement.approvedImageStorageKey !== entry.coverStorageKey
    )) {
      throw new Error("specialstl_media_still_quarantined");
    }
    ids.add(entry.modelId);
    slugs.add(entry.slug);
    keys.add(entry.coverStorageKey);
  }
  return keys;
}

// Exact approved-media keys may release a confirmed quarantined model after review.
export const approvedPublicMediaPaths = validatePublicRenderApprovals(manifest);

/**
 * Targeted hold: restrict only confirmed SpecialSTL models or media paths
 * explicitly carrying that distributor's branding. All other public catalog
 * images retain their existing visibility without requiring a new approval.
 */
const restrictedModelIds = new Set(quarantine.confirmed.map((item) => item.modelId));
const specialstlPathBrand = /(?:^|[^a-z0-9])special[\s._-]*stl(?:\.com)?(?=$|[^a-z0-9])/i;

export function isRestrictedCatalogMediaPath(path) {
  if (typeof path !== "string" || !path.startsWith("media/")) return false;
  if (specialstlPathBrand.test(path)) return true;
  const modelId = path.split("/")[1];
  return restrictedModelIds.has(modelId) && !approvedPublicMediaPaths.has(path);
}
