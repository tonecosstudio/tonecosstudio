const COLLECTION_BACKDROPS: Record<string, string> = {
  thundercats:
    "/assets/collections/thundercats/thundercats-logo-backdrop-neutral.webp",
};

export function getCollectionBackdropUrl(
  slug: string | null | undefined,
  fallbackUrl: string | null | undefined,
) {
  if (slug && COLLECTION_BACKDROPS[slug]) {
    return COLLECTION_BACKDROPS[slug];
  }

  return fallbackUrl ?? null;
}
