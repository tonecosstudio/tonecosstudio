import { useEffect, useRef, useCallback } from "react";

/**
 * Hook para infinite scroll
 * Detecta quando o usuário chega ao final da página e dispara callback
 *
 * @param callback - Função a ser chamada quando chegar ao final
 * @param hasMore - Se há mais itens para carregar
 * @param isLoading - Se está carregando
 * @param threshold - Distância do final em px para disparar (padrão: 100px)
 *
 * @example
 * const { observerRef } = useInfiniteScroll(
 *   () => fetchNextPage(),
 *   hasNextPage,
 *   isFetchingNextPage
 * );
 *
 * return (
 *   <div>
 *     {items.map(item => <Item key={item.id} {...item} />)}
 *     <div ref={observerRef} />
 *   </div>
 * );
 */
export function useInfiniteScroll(
  callback: () => void,
  hasMore: boolean = true,
  isLoading: boolean = false,
  threshold: number = 100
) {
  const observerRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !isLoading) {
        callback();
      }
    },
    [callback, hasMore, isLoading]
  );

  useEffect(() => {
    const element = observerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: `${threshold}px`,
      threshold: 0,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleObserver, threshold]);

  return { observerRef };
}

/**
 * Hook alternativo usando scroll event
 * Útil quando IntersectionObserver não é adequado
 */
export function useScrollToBottom(
  callback: () => void,
  hasMore: boolean = true,
  isLoading: boolean = false,
  threshold: number = 100
) {
  useEffect(() => {
    const handleScroll = () => {
      if (isLoading || !hasMore) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        callback();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [callback, hasMore, isLoading, threshold]);
}
