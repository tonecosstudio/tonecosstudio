/**
 * Hook para prefetch baseado em scroll
 * 
 * Detecta quando o usuário está na metade da página e dispara uma função de prefetch.
 * Útil para melhorar a performance percebida ao pré-carregar a próxima página.
 */

import { useEffect, useRef } from 'react';

export interface UseScrollPrefetchOptions {
  /**
   * Função a ser chamada quando o threshold é atingido
   */
  onPrefetch: () => void;
  
  /**
   * Threshold de scroll (0-1) onde 0.5 = metade da página
   * @default 0.5
   */
  threshold?: number;
  
  /**
   * Se o prefetch está habilitado
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Debounce em ms para evitar chamadas excessivas
   * @default 200
   */
  debounce?: number;
}

/**
 * Hook que detecta quando o usuário está na metade da página e dispara prefetch
 * 
 * @example
 * ```tsx
 * useScrollPrefetch({
 *   onPrefetch: prefetchNextPage,
 *   threshold: 0.5, // Prefetch quando chegar na metade
 *   enabled: !isLastPage
 * });
 * ```
 */
export function useScrollPrefetch({
  onPrefetch,
  threshold = 0.5,
  enabled = true,
  debounce = 200
}: UseScrollPrefetchOptions) {
  const prefetchedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled) {
      prefetchedRef.current = false;
      return;
    }

    const handleScroll = () => {
      // Limpar timeout anterior
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce
      timeoutRef.current = setTimeout(() => {
        // Se já fez prefetch, não fazer novamente
        if (prefetchedRef.current) {
          return;
        }

        // Calcular posição do scroll
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;

        // Calcular progresso do scroll (0-1)
        const scrollProgress = scrollTop / (scrollHeight - clientHeight);

        // Se passou do threshold, fazer prefetch
        if (scrollProgress >= threshold) {
          prefetchedRef.current = true;
          onPrefetch();
        }
      }, debounce);
    };

    // Adicionar listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onPrefetch, threshold, enabled, debounce]);

  // Reset quando a página muda (enabled muda)
  useEffect(() => {
    prefetchedRef.current = false;
  }, [enabled]);
}
