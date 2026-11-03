import { useState } from "react";
import { ImageOff } from "lucide-react";

type CanonicalCatalogImageProps = {
  src: string | null;
  alt: string;
  imageClassName?: string;
  fallbackClassName?: string;
  fallbackLabel?: string;
  loading?: "eager" | "lazy";
};

/**
 * Reusable, read-only image presentation for the published catalog.
 * A missing or broken media asset must never leave a broken-image icon in
 * the Home, model list, Universe, or detail/gallery. No secondary source.
 */
export function CanonicalCatalogImage({
  src,
  alt,
  imageClassName = "h-full w-full object-contain",
  fallbackClassName = "flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-xs text-[hsl(0,0%,56%)]",
  fallbackLabel = "Imagem indisponível",
  loading = "lazy",
}: CanonicalCatalogImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (src && src !== failedSrc) {
    return (
      <img
        key={src}
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        className={imageClassName}
        onError={() => setFailedSrc(src)}
      />
    );
  }
  return (
    <span className={fallbackClassName}>
      <ImageOff size={26} strokeWidth={1.4} aria-hidden="true" />
      <span>{fallbackLabel}</span>
    </span>
  );
}
