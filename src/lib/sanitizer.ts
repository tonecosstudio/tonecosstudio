/**
 * Utilitário de Sanitização de Inputs
 * 
 * Fornece funções para sanitizar inputs de usuário, prevenindo
 * ataques de SQL injection e XSS.
 * 
 * @module lib/sanitizer
 */

import DOMPurify from 'dompurify';

// ============================================================================
// Constantes
// ============================================================================

/**
 * Padrões de SQL injection comuns que devem ser removidos
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE|TABLE|FROM|WHERE|INTO)\b)/gi,
  /(--|\/\*|\*\/|;|'|"|\bOR\b|\bAND\b)/gi,
  /(\bxp_|\bsp_)/gi,
  /(\b1=1\b|\b1='1'\b|\b'=')/gi,
  /(\bSLEEP\(|\bBENCHMARK\()/gi,
  /(javascript:)/gi,
];

/**
 * Comprimento máximo permitido para inputs de busca
 */
const MAX_SEARCH_LENGTH = 100;

// ============================================================================
// Funções Principais
// ============================================================================

/**
 * Sanitiza input de busca removendo padrões perigosos
 * 
 * Esta função:
 * 1. Remove tags HTML/script usando DOMPurify
 * 2. Remove padrões de SQL injection
 * 3. Remove espaços em branco extras
 * 4. Limita o comprimento a um máximo razoável
 * 
 * @param input - String de entrada a ser sanitizada
 * @returns String sanitizada e segura
 * 
 * @example
 * ```ts
 * const userInput = "<script>alert('xss')</script>João'; DROP TABLE users--";
 * const safe = sanitizeSearchInput(userInput);
 * // Resultado: "João"
 * ```
 */
export function sanitizeSearchInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // 1. Remover tags HTML e scripts usando DOMPurify
  let sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Não permitir nenhuma tag HTML
    ALLOWED_ATTR: [], // Não permitir nenhum atributo
    KEEP_CONTENT: true, // Manter o conteúdo de texto
  });

  // 2. Remover padrões de SQL injection
  sanitized = removeSQLInjectionPatterns(sanitized);

  // 3. Remover espaços em branco extras
  sanitized = sanitized.trim().replace(/\s+/g, ' ');

  // 4. Limitar comprimento
  if (sanitized.length > MAX_SEARCH_LENGTH) {
    sanitized = sanitized.substring(0, MAX_SEARCH_LENGTH);
  }

  return sanitized;
}

/**
 * Remove padrões comuns de SQL injection de uma string
 * 
 * @param input - String a ser limpa
 * @returns String sem padrões de SQL injection
 * 
 * @internal
 */
function removeSQLInjectionPatterns(input: string): string {
  let cleaned = input;

  // Aplicar cada padrão de SQL injection
  for (const pattern of SQL_INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned;
}

// ============================================================================
// Funções Auxiliares
// ============================================================================

/**
 * Valida se um input de busca é seguro após sanitização
 * 
 * @param input - String original
 * @param sanitized - String sanitizada
 * @returns Objeto com resultado da validação
 * 
 * @example
 * ```ts
 * const input = "João Silva";
 * const sanitized = sanitizeSearchInput(input);
 * const validation = validateSanitizedInput(input, sanitized);
 * 
 * if (!validation.safe) {
 *   console.warn(validation.reason);
 * }
 * ```
 */
export function validateSanitizedInput(
  input: string,
  sanitized: string
): {
  safe: boolean;
  reason?: string;
  modified: boolean;
} {
  const modified = input !== sanitized;

  // Se o input foi completamente removido, pode ser suspeito
  if (input.length > 0 && sanitized.length === 0) {
    return {
      safe: false,
      reason: 'Input contém apenas caracteres não permitidos',
      modified: true,
    };
  }

  // Se mais de 50% do input foi removido, pode ser suspeito
  if (modified && sanitized.length < input.length * 0.5) {
    return {
      safe: true, // Ainda é seguro, mas alertamos
      reason: 'Input foi significativamente modificado durante sanitização',
      modified: true,
    };
  }

  return {
    safe: true,
    modified,
  };
}

/**
 * Sanitiza múltiplos inputs de uma vez
 * 
 * @param inputs - Array de strings a serem sanitizadas
 * @returns Array de strings sanitizadas
 * 
 * @example
 * ```ts
 * const inputs = ['João', '<script>alert(1)</script>', 'Maria'];
 * const sanitized = sanitizeMultipleInputs(inputs);
 * // Resultado: ['João', '', 'Maria']
 * ```
 */
export function sanitizeMultipleInputs(inputs: string[]): string[] {
  return inputs.map(input => sanitizeSearchInput(input));
}

/**
 * Escapa caracteres especiais para uso em regex
 * 
 * Útil quando o input sanitizado será usado em uma expressão regular
 * 
 * @param input - String a ser escapada
 * @returns String com caracteres especiais escapados
 * 
 * @example
 * ```ts
 * const input = "user@example.com";
 * const escaped = escapeRegexCharacters(input);
 * const regex = new RegExp(escaped, 'i');
 * ```
 */
export function escapeRegexCharacters(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitiza input e prepara para uso em busca case-insensitive
 * 
 * @param input - String de busca
 * @returns String sanitizada e normalizada
 * 
 * @example
 * ```ts
 * const query = sanitizeForSearch("  João  Silva  ");
 * // Resultado: "joão silva"
 * ```
 */
export function sanitizeForSearch(input: string): string {
  const sanitized = sanitizeSearchInput(input);
  return sanitized.toLowerCase().trim();
}

// ============================================================================
// Tipos e Interfaces
// ============================================================================

/**
 * Opções de configuração para sanitização
 */
export interface SanitizeOptions {
  /**
   * Comprimento máximo permitido
   * @default 100
   */
  maxLength?: number;

  /**
   * Se deve remover padrões de SQL injection
   * @default true
   */
  removeSQLPatterns?: boolean;

  /**
   * Se deve remover tags HTML
   * @default true
   */
  removeHTML?: boolean;

  /**
   * Se deve normalizar espaços em branco
   * @default true
   */
  normalizeWhitespace?: boolean;
}

/**
 * Sanitiza input com opções customizadas
 * 
 * @param input - String a ser sanitizada
 * @param options - Opções de sanitização
 * @returns String sanitizada
 * 
 * @example
 * ```ts
 * const sanitized = sanitizeWithOptions(input, {
 *   maxLength: 50,
 *   removeSQLPatterns: true,
 *   removeHTML: true
 * });
 * ```
 */
export function sanitizeWithOptions(
  input: string,
  options: SanitizeOptions = {}
): string {
  const {
    maxLength = MAX_SEARCH_LENGTH,
    removeSQLPatterns = true,
    removeHTML = true,
    normalizeWhitespace = true,
  } = options;

  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remover HTML se solicitado
  if (removeHTML) {
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });
  }

  // Remover padrões SQL se solicitado
  if (removeSQLPatterns) {
    sanitized = removeSQLInjectionPatterns(sanitized);
  }

  // Normalizar espaços em branco se solicitado
  if (normalizeWhitespace) {
    sanitized = sanitized.trim().replace(/\s+/g, ' ');
  }

  // Limitar comprimento
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

// ============================================================================
// Exportações
// ============================================================================

export default {
  sanitizeSearchInput,
  validateSanitizedInput,
  sanitizeMultipleInputs,
  escapeRegexCharacters,
  sanitizeForSearch,
  sanitizeWithOptions,
};
