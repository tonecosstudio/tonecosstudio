/**
 * useDebounce - Hook para debounce de valores
 * 
 * Requirements: 16.15 (debounce de 500ms)
 * 
 * Este hook implementa debounce para evitar atualizações muito frequentes
 * que podem causar thrashing na UI.
 */

import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores
 * @param value Valor a ser debounced
 * @param delay Delay em milissegundos (padrão: 500ms)
 * @returns Valor debounced
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para debounce de callback
 * @param callback Função a ser debounced
 * @param delay Delay em milissegundos (padrão: 500ms)
 * @returns Função debounced
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const debouncedCallback = (...args: Parameters<T>) => {
    if (timer) {
      clearTimeout(timer);
    }

    const newTimer = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimer(newTimer);
  };

  useEffect(() => {
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [timer]);

  return debouncedCallback;
}