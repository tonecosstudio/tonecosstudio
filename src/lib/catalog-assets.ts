import { supabase } from "@/integrations/supabase/client";

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
  return import.meta.env.VITE_CATALOG_ASSET_BASE_URL?.trim().replace(/\/+$/, "");
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
  if (isAbsoluteUrl(path)) return path;
  if (!bucket) return null;

  const normalizedPath = normalizeStoragePath(path);
  const assetBaseUrl = getCatalogAssetBaseUrl();
  if (assetBaseUrl && shouldUseCatalogAssetBase(bucket, normalizedPath)) {
    return `${assetBaseUrl}/${encodeAssetPath(normalizedPath)}`;
  }

  return supabase.storage.from(bucket).getPublicUrl(normalizedPath).data
    .publicUrl;
}
