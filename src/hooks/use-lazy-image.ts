import { useState, useEffect, useRef } from "react";

/**
 * Hook para lazy loading de imagens
 * Carrega imagens apenas quando estão visíveis no viewport
 */
export function useLazyImage(src: string | null, options?: IntersectionObserverInit) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "50px", // Começa a carregar 50px antes de entrar no viewport
        ...options,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src, options]);

  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.src = imageSrc;

    img.onload = () => {
      setIsLoading(false);
      setError(false);
    };

    img.onerror = () => {
      setIsLoading(false);
      setError(true);
    };
  }, [imageSrc]);

  return { imgRef, imageSrc, isLoading, error };
}

/**
 * Hook para preload de imagens
 * Útil para carregar imagens antes de exibi-las
 */
export function useImagePreload(src: string | null) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.src = src;

    img.onload = () => {
      setIsLoaded(true);
      setError(false);
    };

    img.onerror = () => {
      setIsLoaded(false);
      setError(true);
    };
  }, [src]);

  return { isLoaded, error };
}
