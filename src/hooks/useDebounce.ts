/**
 * Hook de Debounce
 * 
 * Atrasa a atualização de um valor até que um período de tempo tenha passado
 * sem mudanças. Útil para otimizar buscas e evitar chamadas excessivas à API.
 */

import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores
 * 
 * @param value - Valor a ser debounced
 * @param delay - Delay em milissegundos (padrão: 300ms)
 * @returns Valor debounced
 * 
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 * 
 * useEffect(() => {
 *   // Esta função só será chamada 300ms após o usuário parar de digitar
 *   if (debouncedSearchTerm) {
 *     performSearch(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Criar timer para atualizar o valor debounced
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpar timer se o valor mudar antes do delay
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para debounce com estado de loading
 * 
 * @param value - Valor a ser debounced
 * @param delay - Delay em milissegundos (padrão: 300ms)
 * @returns Tupla com [valor debounced, isDebouncing]
 * 
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const [debouncedSearchTerm, isSearching] = useDebouncedValue(searchTerm, 300);
 * 
 * // Exibir indicador de loading enquanto debouncing
 * {isSearching && <Spinner />}
 * ```
 */
export function useDebouncedValue<T>(
  value: T,
  delay: number = 300
): [T, boolean] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    // Marcar como debouncing se o valor mudou
    if (value !== debouncedValue) {
      setIsDebouncing(true);
    }

    // Criar timer para atualizar o valor debounced
    const timer = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);

    // Limpar timer se o valor mudar antes do delay
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay, debouncedValue]);

  return [debouncedValue, isDebouncing];
}
