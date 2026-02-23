// @ts-nocheck
import { useLazyImage } from "@/hooks/use-lazy-image";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string | null;
  alt: string;
  className?: string;
  aspectRatio?: "square" | "video" | "portrait" | "auto";
  fallback?: React.ReactNode;
  priority?: boolean; // Se true, não usa lazy loading
}

/**
 * Componente de imagem otimizada com:
 * - Lazy loading automático
 * - Skeleton durante carregamento
 * - Fallback para erros
 * - Aspect ratio responsivo
 */
export function OptimizedImage({
  src,
  alt,
  className,
  aspectRatio = "auto",
  fallback,
  priority = false,
}: OptimizedImageProps) {
  const { imgRef, imageSrc, isLoading, error } = useLazyImage(
    priority ? src : src,
    priority ? { threshold: 1 } : undefined
  );

  const aspectRatioClass = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
    auto: "",
  }[aspectRatio];

  // Estado de erro
  if (error || !src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted",
          aspectRatioClass,
          className
        )}
      >
        {fallback || (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageOff className="h-8 w-8" />
            <span className="text-xs">Imagem não disponível</span>
          </div>
        )}
      </div>
    );
  }

  // Estado de carregamento
  if (isLoading || !imageSrc) {
    return (
      <Skeleton
        ref={imgRef}
        className={cn(aspectRatioClass, className)}
      />
    );
  }

  // Imagem carregada
  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn(
        "object-cover w-full h-full",
        aspectRatioClass,
        className
      )}
    />
  );
}

/**
 * Componente de avatar otimizado
 */
export function OptimizedAvatar({
  src,
  alt,
  size = "md",
  fallback,
}: {
  src: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  fallback?: string;
}) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  const { imgRef, imageSrc, isLoading, error } = useLazyImage(src);

  if (error || !src) {
    return (
      <div
        className={cn(
          "rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold",
          sizeClasses[size]
        )}
      >
        {fallback || alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  if (isLoading || !imageSrc) {
    return (
      <Skeleton
        ref={imgRef}
        className={cn("rounded-full", sizeClasses[size])}
      />
    );
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn(
        "rounded-full object-cover",
        sizeClasses[size]
      )}
    />
  );
}

/**
 * Componente de background image otimizado
 */
export function OptimizedBackgroundImage({
  src,
  alt,
  children,
  className,
  overlay = false,
}: {
  src: string | null;
  alt: string;
  children?: React.ReactNode;
  className?: string;
  overlay?: boolean;
}) {
  const { imgRef, imageSrc, isLoading, error } = useLazyImage(src);

  if (error || !src) {
    return (
      <div
        ref={imgRef}
        className={cn("bg-muted relative", className)}
      >
        {children}
      </div>
    );
  }

  if (isLoading || !imageSrc) {
    return (
      <Skeleton
        ref={imgRef}
        className={cn("relative", className)}
      >
        {children}
      </Skeleton>
    );
  }

  return (
    <div
      ref={imgRef}
      className={cn("relative", className)}
      style={{
        backgroundImage: `url(${imageSrc})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {overlay && (
        <div className="absolute inset-0 bg-black/50" />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
