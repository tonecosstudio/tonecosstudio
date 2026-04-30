import { ImgHTMLAttributes, useState } from 'react';

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}

/**
 * Componente de imagem otimizado com lazy loading
 *
 * @param priority - Se true, carrega a imagem imediatamente (para imagens above the fold)
 * @param src - URL da imagem
 * @param alt - Texto alternativo
 * @param className - Classes CSS
 */
export function LazyImage({
  src,
  alt,
  priority = false,
  className = '',
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      onLoad={() => setIsLoaded(true)}
      {...(priority && { fetchpriority: 'high' })}
      {...props}
    />
  );
}
