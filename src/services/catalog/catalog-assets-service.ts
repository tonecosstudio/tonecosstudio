import { getPublicStorageUrl } from "@/services/supabase/storage-client";

const CLOUDFLARE_R2_BUCKET_NAMES = new Set([
  "cloudflare-r2",
  "r2",
  "catalog-r2",
]);

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function normalizeStoragePath(path: string) {
  return trimSlashes(path.replace(/\\/g, "/"));
}

function encodeAssetPath(path: string) {
  return normalizeStoragePath(path)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function getCatalogAssetBaseUrl() {
  // Legacy R2 assets must not silently reuse the OS domain or the current
  // site's origin. A future verified first-party media proxy is required.
  const value = import.meta.env.VITE_CATALOG_ASSET_BASE_URL?.trim().replace(/\/+$/, "");
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.hostname === "ordax.com.br" ||
      url.hostname === "www.ordax.com.br"
    ) {
      return null;
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function shouldUseCatalogAssetBase(bucket: string, path: string) {
  const normalizedBucket = bucket.trim().toLocaleLowerCase();
  return (
    CLOUDFLARE_R2_BUCKET_NAMES.has(normalizedBucket) ||
    normalizeStoragePath(path).startsWith("catalog-webp-final/")
  );
}

export function getCatalogStoragePublicUrl(
  bucket: string | null,
  path: string | null,
) {
  if (!path) return null;
  if (isAbsoluteUrl(path)) {
    try {
      const absolute = new URL(path);
      if (
        absolute.hostname === "ordax.com.br" ||
        absolute.hostname === "www.ordax.com.br"
      ) {
        return null;
      }
      return path;
    } catch {
      return null;
    }
  }
  if (!bucket) return null;

  const normalizedPath = normalizeStoragePath(path);
  const assetBaseUrl = getCatalogAssetBaseUrl();
  if (shouldUseCatalogAssetBase(bucket, normalizedPath)) {
    return assetBaseUrl ? `${assetBaseUrl}/${encodeAssetPath(normalizedPath)}` : null;
  }

  return getPublicStorageUrl(bucket, normalizedPath);
}
