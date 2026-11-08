/**
 * Shared client presentation of the server-reviewed release manifest.
 * It never grants rights: Vercel validates the same JSON and enforces every
 * exact media key at the server boundary. Zero records means zero images.
 */
import manifest from "./public-render-approvals.json";

export type ApprovedPublicRender = {
  modelId: string;
  slug: string;
  coverStorageKey: string;
  provenance: "tonart-original-render" | "authorized-third-party-render";
  sourceFileRef: string;
  rightsEvidenceRef: string;
  rightsHolder: string;
  creatorCredit: string;
  publicationScope: "tonartstudio.com.br";
  ownerApproved: true;
  approvedOn: string;
};

export const approvedPublicRenders: readonly ApprovedPublicRender[] =
  manifest.approved as ApprovedPublicRender[];

export function findApprovedPublicRender(slug: string | null | undefined) {
  return approvedPublicRenders.find((entry) => entry.slug === slug);
}

export function isApprovedPublicCover(
  model: { id: string; slug: string; coverStorageKey: string | null },
  entries: readonly ApprovedPublicRender[] = approvedPublicRenders,
): boolean {
  return entries.some(
    (entry) =>
      entry.modelId === model.id &&
      entry.slug === model.slug &&
      entry.coverStorageKey === model.coverStorageKey,
  );
}

export function isApprovedPublicMediaKey(key: string | null | undefined): boolean {
  return typeof key === "string" &&
    approvedPublicRenders.some((entry) => entry.coverStorageKey === key);
}

/** A direct <img> source is only accepted if it equals an exact first-party
 * approved-media URL. No arbitrary external link or unapproved variant. */
export function isApprovedPublicMediaUrl(
  src: string | null | undefined,
  catalogApiBase: string,
): boolean {
  if (!src || !catalogApiBase) return false;
  try {
    const base = new URL(catalogApiBase);
    if (base.protocol !== "https:" || !base.pathname.endsWith("/") ||
        base.search || base.hash || base.username || base.password) return false;
    return approvedPublicRenders.some((entry) => {
      const path = entry.coverStorageKey.split("/").map((part) =>
        encodeURIComponent(part).replace(/[!'()*]/g, (char) =>
          "%" + char.charCodeAt(0).toString(16).toUpperCase(),
        ),
      ).join("/");
      return new URL(path, base).toString() === src;
    });
  } catch {
    return false;
  }
}
