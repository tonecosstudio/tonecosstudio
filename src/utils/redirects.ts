/**
 * Sistema de Redirecionamentos
 * 
 * Gerencia redirects de compatibilidade para URLs antigas
 * e detecta loops circulares.
 */

import { activeRedirects, isDeprecatedRedirect, type RedirectRule } from '@/config/redirects.config';

/**
 * Encontra um redirecionamento para um path específico
 */
export function findRedirectForPath(path: string): RedirectRule | null {
  return activeRedirects.find(redirect => redirect.from === path) || null;
}

/**
 * Verifica se um path é um redirecionamento obsoleto
 */
export function isObsoleteRedirect(path: string): boolean {
  return isDeprecatedRedirect(path);
}

/**
 * Detecta loops circulares em redirecionamentos
 * Retorna true se detectar um loop
 */
export function detectRedirectLoop(startPath: string, maxDepth: number = 10): boolean {
  const visited = new Set<string>();
  let currentPath = startPath;
  let depth = 0;

  while (depth < maxDepth) {
    if (visited.has(currentPath)) {
      // Loop detectado
      console.error(`[Redirect Loop] Detected circular redirect starting from: ${startPath}`);
      return true;
    }

    visited.add(currentPath);

    const redirect = findRedirectForPath(currentPath);
    if (!redirect) {
      // Não há mais redirects, caminho válido
      return false;
    }

    currentPath = redirect.to;
    depth++;
  }

  // Atingiu profundidade máxima, possível loop
  console.warn(`[Redirect] Max depth reached for path: ${startPath}`);
  return true;
}

/**
 * Resolve um path seguindo a cadeia de redirects
 * Retorna o path final ou null se houver loop
 */
export function resolveRedirectChain(path: string): string | null {
  if (detectRedirectLoop(path)) {
    return null;
  }

  let currentPath = path;
  let redirect = findRedirectForPath(currentPath);

  while (redirect) {
    currentPath = redirect.to;
    redirect = findRedirectForPath(currentPath);
  }

  return currentPath;
}

/**
 * Loga tentativas de acesso a redirects para monitoramento
 */
export function logRedirectAccess(from: string, to: string, reason: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Redirect] ${from} → ${to} (${reason})`);
  }

  // Em produção, você pode enviar para um serviço de analytics
  // analytics.track('redirect_accessed', { from, to, reason });
}

/**
 * Loga tentativas de acesso a páginas obsoletas
 */
export function logObsoletePageAccess(path: string): void {
  console.warn(`[Obsolete Page] Attempted access to removed page: ${path}`);

  // Em produção, você pode enviar para um serviço de analytics
  // analytics.track('obsolete_page_accessed', { path });
}
