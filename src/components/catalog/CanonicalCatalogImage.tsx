import { useState, type ReactNode } from "react";
import { ImageOff } from "lucide-react";

type CanonicalCatalogImageProps = {
  src: string | null;
  alt: string;
  imageClassName?: string;
  fallbackClassName?: string;
  fallbackLabel?: string;
  fallbackIcon?: ReactNode;
  loading?: "eager" | "lazy";
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
  return <CatalogImageSource key={props.src ?? "absent"} {...props} />;
}

function CatalogImageSource({
  src,
  alt,
  imageClassName = "h-full w-full object-contain",
  fallbackClassName = "flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-xs text-[hsl(0,0%,56%)]",
  fallbackLabel = "Imagem indisponível",
  fallbackIcon,
  loading = "lazy",
}: CanonicalCatalogImageProps) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        className={imageClassName}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className={fallbackClassName}>
      {fallbackIcon ?? <ImageOff size={26} strokeWidth={1.4} aria-hidden="true" />}
      {fallbackLabel ? <span>{fallbackLabel}</span> : null}
    </span>
  );
}
