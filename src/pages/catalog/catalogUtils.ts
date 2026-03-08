/**
 * Utilitários compartilhados para o sistema de catálogo
 */

/**
 * Constrói o título do modelo combinando nome e franquia
 */
export function buildModelTitle(name: string, franchise: string | null): string {
  if (!franchise) return name;
  return `${name} (${franchise})`;
}

/**
 * Compacta array de tags para exibição limitada
 */
export function compactTags(tags: string[] | null, limit: number = 2): string[] {
  if (!tags || tags.length === 0) return [];
  return tags.slice(0, limit);
}
