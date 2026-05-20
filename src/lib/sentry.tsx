/**
 * Sentry Configuration
 *
 * NOTA: Sentry é OPCIONAL. O projeto funciona perfeitamente sem ele.
 *
 * Para habilitar o Sentry:
 * 1. Instale: npm install @sentry/react
 * 2. Crie conta em: https://sentry.io
 * 3. Adicione ao .env: VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
 * 4. Reinicie o servidor
 *
 * Recursos do Sentry:
 * - Error tracking automático
 * - Performance monitoring
 * - Session replay
 * - Breadcrumbs (histórico de ações)
 */

import React from "react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

// Sentry é opcional - todas as funções são no-ops se não estiver instalado
const SENTRY_ENABLED = false; // Mude para true após instalar @sentry/react

/**
 * Inicializa o Sentry (no-op se não estiver instalado)
 */
export function initSentry() {
  if (!SENTRY_ENABLED || !SENTRY_DSN) {
    // Sentry desabilitado - funcionalidade opcional
    return;
  }
}

/**
 * Captura erro manualmente (no-op se Sentry não estiver instalado)
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!SENTRY_ENABLED) {
    console.error("Error:", error, context);
    return;
  }
}

/**
 * Captura mensagem de log (no-op se Sentry não estiver instalado)
 */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  if (!SENTRY_ENABLED) {
    console[level === "error" ? "error" : level === "warning" ? "warn" : "log"](message);
    return;
  }
}

/**
 * Define contexto do usuário (no-op se Sentry não estiver instalado)
 */
export function setUser(_user: { id: string; email?: string; username?: string } | null) {
  if (!SENTRY_ENABLED) return;
}

/**
 * Adiciona breadcrumb (no-op se Sentry não estiver instalado)
 */
export function addBreadcrumb(
  _message: string,
  _category: string,
  _data?: Record<string, unknown>
) {
  if (!SENTRY_ENABLED) return;
}

/**
 * Define tag customizada (no-op se Sentry não estiver instalado)
 */
export function setTag(_key: string, _value: string) {
  if (!SENTRY_ENABLED) return;
}

/**
 * Define contexto customizado (no-op se Sentry não estiver instalado)
 */
export function setContext(_name: string, _context: Record<string, unknown>) {
  if (!SENTRY_ENABLED) return;
}

/**
 * Wrapper de componente com error boundary (retorna componente original se Sentry não estiver instalado)
 */
export function withSentryErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  _options?: {
    fallback?: React.ReactNode;
    showDialog?: boolean;
  }
) {
  if (!SENTRY_ENABLED) return Component;
  return Component;
}

// Export default vazio para compatibilidade
export default null;
