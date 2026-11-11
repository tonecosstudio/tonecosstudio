import { describe, expect, it } from "vitest";
import {
  approvedPublicRenders,
  isApprovedPublicCover,
  isApprovedPublicMediaKey,
  isApprovedPublicMediaUrl,
  type ApprovedPublicRender,
} from "./approved-public-renders";

const candidate: ApprovedPublicRender = {
  modelId: "mdl_1234567890abcdef1234",
  slug: "escultura-original",
  coverStorageKey: "media/mdl_1234567890abcdef1234/asset_123/card.webp",
  provenance: "authorized-third-party-render",
  sourceFileRef: "drive:123456789012345678901234",
  sourceSha256: "a".repeat(64),
  rightsEvidenceRef: "drive:234567890123456789012345",
  rightsHolder: "Estudio autor",
  creatorCredit: "Escultor autor",
  publicationScope: "tonartstudio.com.br",
  ownerApproved: true,
  approvedOn: "2026-11-08",
};

describe("exact digital-render release identity", () => {
  it("has no live approvals until real rights evidence is recorded", () => {
    expect(approvedPublicRenders).toEqual([]);
    expect(isApprovedPublicMediaKey(candidate.coverStorageKey)).toBe(false);
  });

  it("matches a model only when ID, slug and cover are identical", () => {
    const model = { id: candidate.modelId, slug: candidate.slug, coverStorageKey: candidate.coverStorageKey };
    expect(isApprovedPublicCover(model, [candidate])).toBe(true);
    expect(isApprovedPublicCover({ ...model, id: "mdl_other" }, [candidate])).toBe(false);
    expect(isApprovedPublicCover({ ...model, slug: "outro" }, [candidate])).toBe(false);
    expect(isApprovedPublicCover({ ...model, coverStorageKey: "media/elsewhere/card.webp" }, [candidate])).toBe(false);
  });

  it("recognizes only the exact first-party approved cover URL", () => {
    const base = "https://tonartstudio.com.br/catalogo-api/";
    const approved = new URL(candidate.coverStorageKey, base).toString();
    expect(isApprovedPublicMediaUrl(approved, base, [candidate])).toBe(true);
    for (const url of [
      approved + "?x=1",
      approved.replace("tonartstudio.com.br", "other.example"),
      approved.replace("card.webp", "detail.webp"),
      "https://other.example/" + candidate.coverStorageKey,
    ]) {
      expect(isApprovedPublicMediaUrl(url, base, [candidate])).toBe(false);
    }
    expect(isApprovedPublicMediaUrl(approved, "http://tonartstudio.com.br/catalogo-api/", [candidate])).toBe(false);
  });
});
