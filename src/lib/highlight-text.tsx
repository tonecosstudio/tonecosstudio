/**
 * Utilitário para destacar termos de busca em texto
 * 
 * Fornece função para destacar visualmente termos correspondentes
 * em resultados de busca.
 */

import React from 'react';

/**
 * Destaca termos de busca em um texto
 * 
 * @param text - Texto onde buscar e destacar
 * @param searchQuery - Termo de busca a ser destacado
 * @returns Array de elementos React com texto destacado
 */
export function highlightText(text: string, searchQuery: string): React.ReactNode {
  // Se não há query de busca, retorna o texto original
  if (!searchQuery || !searchQuery.trim()) {
    return text;
  }

  // Sanitiza a query para uso em regex
  const sanitizedQuery = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Cria regex case-insensitive para encontrar todas as ocorrências
  const regex = new RegExp(`(${sanitizedQuery})`, 'gi');
  
  // Divide o texto em partes (matched e não-matched)
  const parts = text.split(regex);
  
  // Se não há matches, retorna o texto original
  if (parts.length === 1) {
    return text;
  }
  
  // Retorna array de elementos com highlights
  return parts.map((part, index) => {
    // Verifica se esta parte corresponde à query (case-insensitive)
    const isMatch = part.toLowerCase() === sanitizedQuery.toLowerCase();
    
    if (isMatch) {
      return (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-900/50 text-inherit font-medium px-0.5 rounded"
        >
          {part}
        </mark>
      );
    }
    
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

/**
 * Componente wrapper para texto com highlight
 * 
 * @param text - Texto a ser exibido
 * @param searchQuery - Termo de busca a ser destacado
 */
export function HighlightedText({ 
  text, 
  searchQuery 
}: { 
  text: string; 
  searchQuery: string;
}) {
  return <>{highlightText(text, searchQuery)}</>;
}
