import { useState, type ReactNode } from "react";
import { ImageOff } from "lucide-react";
import { isCatalogMediaUnderReview } from "@/config/catalog-public-mvp";
import { CANONICAL_CATALOG_API_BASE } from "@/config/canonical-catalog-endpoint";
import { isApprovedPublicMediaUrl } from "@/services/catalog/approved-public-renders";

type CanonicalCatalogImageProps = {
  src: string | null;
  /** A different approved variant of the same image, used only on failure. */
  fallbackSrc?: string | null;
  alt: string;
  imageClassName?: string;
  fallbackClassName?: string;
  fallbackLabel?: string;
  fallbackIcon?: ReactNode;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
};

/**
 * Reusable, read-only image presentation for the published catalog.
 * A missing or broken media asset must never leave a broken-image icon in
 * the Home, model list, Universe, or detail/gallery. No secondary source.
 */
/**
 * Key the failure state by the current source. A gallery visit A -> B -> A
 * must be able to retry A rather than reusing its failure from the first
 * visit (e.g. after a transient network error).
 */
export function CanonicalCatalogImage(props: CanonicalCatalogImageProps) {
  const hold = isCatalogMediaUnderReview();
  const mediaUnderReview = hold &&
    !isApprovedPublicMediaUrl(props.src, CANONICAL_CATALOG_API_BASE);
  // A failed released cover may not fall back to another, unapproved image.
  const fallbackSrc = hold &&
    !isApprovedPublicMediaUrl(props.fallbackSrc, CANONICAL_CATALOG_API_BASE)
      ? null
      : props.fallbackSrc;
  return (
    <CatalogImageSource
      key={JSON.stringify([mediaUnderReview, props.src, fallbackSrc])}
      {...props}
      fallbackSrc={fallbackSrc}
      mediaUnderReview={mediaUnderReview}
    />
  );
}

function CatalogImageSource({
  src,
  fallbackSrc = null,
  alt,
  imageClassName = "h-full w-full object-contain",
  fallbackClassName = "flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-xs text-[hsl(0,0%,56%)]",
  fallbackLabel = "Imagem indisponível",
  fallbackIcon,
  loading = "lazy",
  fetchPriority,
  mediaUnderReview,
}: CanonicalCatalogImageProps & { mediaUnderReview: boolean }) {
  const [failedVariant, setFailedVariant] = useState<"primary" | "fallback" | null>(null);
  // Never invent an alternative media source: only a separately approved,
  // provided variant may be used, and only after the primary image fails.
  const currentSrc = failedVariant === null
    ? src
    : failedVariant === "primary" && fallbackSrc !== src
      ? fallbackSrc
      : null;
  // Defense in depth: block even an accidentally supplied direct image URL.
  if (!mediaUnderReview && currentSrc) {
    return (
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        {...(fetchPriority ? { fetchpriority: fetchPriority } : {})}
        className={imageClassName}
        onError={() => setFailedVariant((current) => current === null ? "primary" : "fallback")}
      />
    );
  }
  return (
    <span className={fallbackClassName}>
      {fallbackIcon ?? <ImageOff size={26} strokeWidth={1.4} aria-hidden="true" />}
      {mediaUnderReview ? <span>Imagem em revisão</span> : fallbackLabel ? <span>{fallbackLabel}</span> : null}
    </span>
  );
}
