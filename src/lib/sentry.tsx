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
const IS_PRODUCTION = import.meta.env.PROD;
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";

// Sentry é opcional - todas as funções são no-ops se não estiver instalado
const SENTRY_ENABLED = false; // Mude para true após instalar @sentry/react

/**
 * Inicializa o Sentry (no-op se não estiver instalado)
 */
export function initSentry() {
  if (!SENTRY_ENABLED || !SENTRY_DSN) {
    if (!SENTRY_DSN) {
      console.log("ℹ️ Sentry DSN não configurado. Error tracking desabilitado.");
    }
    return;
  }

  // TODO: Descomentar após instalar @sentry/react
  /*
  import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: IS_PRODUCTION ? "production" : "development",
      release: `ordax@${APP_VERSION}`,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,
      replaysSessionSampleRate: IS_PRODUCTION ? 0.1 : 1.0,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event, hint) {
        if (!IS_PRODUCTION && event.exception) {
          console.error("Sentry Error (dev):", hint.originalException || hint.syntheticException);
          return null;
        }
        const error = hint.originalException as Error;
        if (error?.message?.includes("ResizeObserver loop")) {
          return null;
        }
        return event;
      },
      ignoreErrors: [
        "ResizeObserver loop limit exceeded",
        "Non-Error promise rejection captured",
        "NetworkError",
        "Failed to fetch",
        "chrome-extension://",
        "moz-extension://",
      ],
    });
    console.log("✅ Sentry inicializado com sucesso");
  }).catch((error) => {
    console.error("❌ Erro ao inicializar Sentry:", error);
  });
  */
}

/**
 * Captura erro manualmente (no-op se Sentry não estiver instalado)
 */
export function captureError(error: Error, context?: Record<string, any>) {
  if (!SENTRY_ENABLED) {
    console.error("Error:", error, context);
    return;
  }
  // TODO: Descomentar após instalar @sentry/react
  // Sentry.captureException(error, { extra: context });
}

/**
 * Captura mensagem de log (no-op se Sentry não estiver instalado)
 */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  if (!SENTRY_ENABLED) {
    console[level === "error" ? "error" : level === "warning" ? "warn" : "log"](message);
    return;
  }
  // TODO: Descomentar após instalar @sentry/react
  // Sentry.captureMessage(message, level);
}

/**
 * Define contexto do usuário (no-op se Sentry não estiver instalado)
 */
export function setUser(user: { id: string; email?: string; username?: string } | null) {
  if (!SENTRY_ENABLED) return;
  // TODO: Descomentar após instalar @sentry/react
  // if (user) {
  //   Sentry.setUser({ id: user.id, email: user.email, username: user.username });
  // } else {
  //   Sentry.setUser(null);
  // }
}

/**
 * Adiciona breadcrumb (no-op se Sentry não estiver instalado)
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  if (!SENTRY_ENABLED) return;
  // TODO: Descomentar após instalar @sentry/react
  // Sentry.addBreadcrumb({ message, category, data, level: "info" });
}

/**
 * Define tag customizada (no-op se Sentry não estiver instalado)
 */
export function setTag(key: string, value: string) {
  if (!SENTRY_ENABLED) return;
  // TODO: Descomentar após instalar @sentry/react
  // Sentry.setTag(key, value);
}

/**
 * Define contexto customizado (no-op se Sentry não estiver instalado)
 */
export function setContext(name: string, context: Record<string, any>) {
  if (!SENTRY_ENABLED) return;
  // TODO: Descomentar após instalar @sentry/react
  // Sentry.setContext(name, context);
}

/**
 * Wrapper de componente com error boundary (retorna componente original se Sentry não estiver instalado)
 */
export function withSentryErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ReactNode;
    showDialog?: boolean;
  }
) {
  if (!SENTRY_ENABLED) return Component;
  
  // TODO: Descomentar após instalar @sentry/react
  // return Sentry.withErrorBoundary(Component, {
  //   fallback: options?.fallback || React.createElement(ErrorFallback),
  //   showDialog: options?.showDialog ?? false,
  // });
  
  return Component;
}

/**
 * Componente de fallback para erros
 */
function ErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <div className="text-6xl">😔</div>
        <h1 className="text-2xl font-bold">Algo deu errado</h1>
        <p className="text-muted-foreground">
          Desculpe, ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Recarregar Página
        </button>
      </div>
    </div>
  );
}

// Export default vazio para compatibilidade
export default null;
