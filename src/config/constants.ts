/**
 * 🔧 CONFIGURAÇÕES CENTRALIZADAS DO SISTEMA
 *
 * Este arquivo centraliza todas as constantes e configurações do projeto,
 * eliminando valores hardcoded espalhados pelo código.
 *
 * Prioridade de configuração:
 * 1. Variáveis de ambiente (.env)
 * 2. Valores padrão definidos aqui
 */

import { APP_ROUTES } from "./routes";

// ============================================================================
// 🌐 CONFIGURAÇÕES DE AMBIENTE
// ============================================================================

export const ENV = {
  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
  SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",

  // Sentry (opcional)
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || "",

  // Versão da aplicação
  APP_VERSION: import.meta.env.VITE_APP_VERSION || "0.1.0",

  // Ambiente
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
} as const;

// ============================================================================
// 💰 CONFIGURAÇÕES DE PREÇOS E PAGAMENTOS
// ============================================================================

export const PRICING = {
  // Preços padrão (fallback quando não há configuração no banco)
  DEFAULT_PRICE_FULL: Number(import.meta.env.VITE_DEFAULT_PRICE_FULL) || 500,
  DEFAULT_PRICE_PIX: Number(import.meta.env.VITE_DEFAULT_PRICE_PIX) || 475,
  DEFAULT_DEPOSIT_AMOUNT:
    Number(import.meta.env.VITE_DEFAULT_DEPOSIT_AMOUNT) || 100,

  // Descontos
  PIX_DISCOUNT_PERCENTAGE:
    Number(import.meta.env.VITE_PIX_DISCOUNT_PERCENTAGE) || 5,
  get PIX_DISCOUNT_MULTIPLIER() {
    return 1 - this.PIX_DISCOUNT_PERCENTAGE / 100;
  },

  // Coins
  COIN_EXCHANGE_REFERENCE_COINS: Math.max(
    1,
    Number(import.meta.env.VITE_COIN_EXCHANGE_REFERENCE_COINS) || 100,
  ),
  DEFAULT_COINS_PER_PIECE:
    Number(import.meta.env.VITE_DEFAULT_COINS_PER_PIECE) || 100,
  COIN_PREVIEW_AMOUNT: Number(import.meta.env.VITE_COIN_PREVIEW_AMOUNT) || 1000,
  get DEFAULT_COIN_UNIT_VALUE() {
    return this.DEFAULT_PRICE_FULL / this.COIN_EXCHANGE_REFERENCE_COINS;
  },

  // Parcelamento
  MAX_INSTALLMENTS_NO_INTEREST:
    Number(import.meta.env.VITE_MAX_INSTALLMENTS_NO_INTEREST) || 6,
  MAX_INSTALLMENTS_WITH_INTEREST:
    Number(import.meta.env.VITE_MAX_INSTALLMENTS_WITH_INTEREST) || 10,

  // Valores calculados
  get DEFAULT_REMAINING_FULL() {
    return this.DEFAULT_PRICE_FULL - this.DEFAULT_DEPOSIT_AMOUNT;
  },
  get DEFAULT_REMAINING_PIX() {
    return this.DEFAULT_PRICE_PIX - this.DEFAULT_DEPOSIT_AMOUNT;
  },
} as const;

// ============================================================================
// 📦 CONFIGURAÇÕES DE PRODUÇÃO E LOTES
// ============================================================================

export const BATCH = {
  // Dias úteis para envio (5º dia útil)
  SHIPPING_BUSINESS_DAYS:
    Number(import.meta.env.VITE_SHIPPING_BUSINESS_DAYS) || 5,

  // Ciclos por mês (fixo: 2 ciclos)
  CYCLES_PER_MONTH: 2,

  // Dias de corte dos ciclos
  CYCLE1_START_DAY: 1,
  CYCLE1_END_DAY: 15,
  CYCLE2_START_DAY: 16,
  // CYCLE2_END_DAY é o último dia do mês (dinâmico)

  // Prazo para troca de coleções (dias antes do fechamento)
  EXCHANGE_DEADLINE_DAYS:
    Number(import.meta.env.VITE_EXCHANGE_DEADLINE_DAYS) || 1,

  // Limite de ciclos futuros a calcular
  FUTURE_BATCHES_COUNT: Number(import.meta.env.VITE_FUTURE_BATCHES_COUNT) || 12,

  // Fallbacks de producao quando system_settings ainda nao foi carregado
  PRODUCTION_DAYS_MIN: Number(import.meta.env.VITE_PRODUCTION_DAYS_MIN) || 15,
  PRODUCTION_DAYS_MAX: Number(import.meta.env.VITE_PRODUCTION_DAYS_MAX) || 20,
  SALES_DURATION_DAYS: Number(import.meta.env.VITE_SALES_DURATION_DAYS) || 30,
  DELIVERY_INTERVAL_DAYS:
    Number(import.meta.env.VITE_DELIVERY_INTERVAL_DAYS) || 90,
  CHARACTER_CHOICE_DAYS:
    Number(import.meta.env.VITE_CHARACTER_CHOICE_DAYS) || 7,
  BALANCE_PAYMENT_DAYS: Number(import.meta.env.VITE_BALANCE_PAYMENT_DAYS) || 5,
  MONTHLY_PRODUCTION_LIMIT:
    Number(import.meta.env.VITE_MONTHLY_PRODUCTION_LIMIT) || 20,
  SALES_OPEN_DAY: Number(import.meta.env.VITE_SALES_OPEN_DAY) || 15,
} as const;

// ============================================================================
// 📧 CONFIGURAÇÕES DE EMAIL E CONTATO
// ============================================================================

export const ASSETS = {
  DEFAULT_ICON_URL: "/favicon.ico",
  FALLBACK_IMAGE_URL: "/image-fallback.svg",
} as const;

export const CONTACT = {
  // Emails
  SUPPORT_EMAIL: import.meta.env.VITE_SUPPORT_EMAIL || "suporte@ordax.com.br",
  CONTACT_EMAIL: import.meta.env.VITE_CONTACT_EMAIL || "contato@ordax.com.br",
  PRIVACY_EMAIL:
    import.meta.env.VITE_PRIVACY_EMAIL || "privacidade@ordax.com.br",
  DPO_EMAIL: import.meta.env.VITE_DPO_EMAIL || "dpo@ordax.com.br",

  // Website
  WEBSITE_URL: import.meta.env.VITE_WEBSITE_URL || "https://ordax.com.br",
  COMPANY_LOGO_URL:
    import.meta.env.VITE_COMPANY_LOGO_URL || ASSETS.DEFAULT_ICON_URL,
  BUSINESS_HOURS:
    import.meta.env.VITE_BUSINESS_HOURS || "Segunda a Sexta, 9h às 18h",

  // Empresa
  COMPANY_NAME: import.meta.env.VITE_COMPANY_NAME || "Tonecos Studios",
  LEGAL_NAME: import.meta.env.VITE_LEGAL_NAME || "Tonecos Studios LTDA",
  COMPANY_ADDRESS: import.meta.env.VITE_COMPANY_ADDRESS || "",
} as const;

// ============================================================================
// 🔔 CONFIGURAÇÕES DE NOTIFICAÇÕES E REALTIME
// ============================================================================

export const NOTIFICATIONS = {
  // Tempo para considerar usuário online (minutos)
  USER_ONLINE_THRESHOLD_MINUTES:
    Number(import.meta.env.VITE_USER_ONLINE_THRESHOLD) || 5,

  // Intervalo de polling para notificações (ms)
  POLLING_INTERVAL_MS:
    Number(import.meta.env.VITE_NOTIFICATION_POLLING_INTERVAL) || 30000,

  // Tempo de exibição de toast (ms)
  TOAST_DURATION_MS: Number(import.meta.env.VITE_TOAST_DURATION) || 5000,
} as const;

// ============================================================================
// 🎨 CONFIGURAÇÕES DE UI E UX
// ============================================================================

export const UI = {
  // Paginação
  DEFAULT_PAGE_SIZE: Number(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 20,
  ITEMS_PER_PAGE_OPTIONS: [10, 20, 50, 100],

  // Debounce (ms)
  SEARCH_DEBOUNCE_MS: Number(import.meta.env.VITE_SEARCH_DEBOUNCE) || 300,
  INPUT_DEBOUNCE_MS: Number(import.meta.env.VITE_INPUT_DEBOUNCE) || 500,

  // Lazy loading
  LAZY_LOAD_THRESHOLD: Number(import.meta.env.VITE_LAZY_LOAD_THRESHOLD) || 100,

  // Imagens
  IMAGE_COMPRESSION_QUALITY:
    Number(import.meta.env.VITE_IMAGE_COMPRESSION_QUALITY) || 0.8,
  MAX_IMAGE_SIZE_MB: Number(import.meta.env.VITE_MAX_IMAGE_SIZE_MB) || 5,
} as const;

// ============================================================================
// 🔒 CONFIGURAÇÕES DE SEGURANÇA
// ============================================================================

export const SECURITY = {
  // Retry e timeout
  MAX_RETRY_ATTEMPTS: Number(import.meta.env.VITE_MAX_RETRY_ATTEMPTS) || 3,
  RETRY_DELAY_MS: Number(import.meta.env.VITE_RETRY_DELAY) || 1000,
  REQUEST_TIMEOUT_MS: Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 30000,

  // Rate limiting
  MAX_REQUESTS_PER_MINUTE:
    Number(import.meta.env.VITE_MAX_REQUESTS_PER_MINUTE) || 60,
} as const;

// ============================================================================
// 📊 CONFIGURAÇÕES DE ANALYTICS E LOGS
// ============================================================================

export const ANALYTICS = {
  // Sentry
  ENABLE_SENTRY: import.meta.env.VITE_ENABLE_SENTRY === "true",
  SENTRY_SAMPLE_RATE: Number(import.meta.env.VITE_SENTRY_SAMPLE_RATE) || 1.0,

  // Logs
  ENABLE_DEBUG_LOGS:
    import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true" || ENV.IS_DEVELOPMENT,
} as const;

// ============================================================================
// 🎯 CONFIGURAÇÕES DE PLANOS E ASSINATURAS
// ============================================================================

export const PLANS = {
  // Tipos de planos disponíveis
  TYPES: ["avulso", "mensal", "trimestral", "semestral", "anual"] as const,

  // Entregas por tipo de plano (padrão)
  DEFAULT_DELIVERIES: {
    avulso: 1,
    mensal: 1,
    trimestral: 3,
    semestral: 6,
    anual: 12,
  } as const,

  // Dias para próxima entrega (padrão)
  DAYS_TO_NEXT_DELIVERY:
    Number(import.meta.env.VITE_DAYS_TO_NEXT_DELIVERY) || 30,
} as const;

// ============================================================================
// 🌍 CONFIGURAÇÕES DE LOCALIZAÇÃO
// ============================================================================

export const LOCALE = {
  // Idioma padrão
  DEFAULT_LANGUAGE: import.meta.env.VITE_DEFAULT_LANGUAGE || "pt-BR",

  // Moeda
  CURRENCY: import.meta.env.VITE_CURRENCY || "BRL",
  CURRENCY_SYMBOL: import.meta.env.VITE_CURRENCY_SYMBOL || "R$",

  // Timezone
  TIMEZONE: import.meta.env.VITE_TIMEZONE || "America/Sao_Paulo",
} as const;

// ============================================================================
// 🔗 ROTAS E URLS
// ============================================================================

export const ROUTES = APP_ROUTES;

// ============================================================================
// 🎨 CONFIGURAÇÕES DE TEMA
// ============================================================================

export const THEME = {
  // Cores de status
  STATUS_COLORS: {
    pending: "yellow",
    processing: "blue",
    completed: "green",
    cancelled: "red",
    failed: "red",
  } as const,

  // Badges de planos
  PLAN_BADGES: {
    trimestral: {
      label: "Mais escolhido",
      color: "primary",
    },
    semestral: {
      label: "Melhor valor",
      color: "amber",
    },
  } as const,
} as const;

// ============================================================================
// 📝 VALIDAÇÕES E LIMITES
// ============================================================================

export const VALIDATION = {
  // Texto
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_MESSAGE_LENGTH: 5000,

  // Arquivos
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  MAX_FILE_SIZE_BYTES: UI.MAX_IMAGE_SIZE_MB * 1024 * 1024,

  // Números
  MIN_PRICE: 0,
  MAX_PRICE: 999999,
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 1000,
} as const;

// ============================================================================
// 🚀 EXPORTAÇÃO PADRÃO
// ============================================================================

export default {
  ENV,
  PRICING,
  BATCH,
  CONTACT,
  NOTIFICATIONS,
  UI,
  SECURITY,
  ANALYTICS,
  PLANS,
  LOCALE,
  ROUTES,
  THEME,
  VALIDATION,
} as const;
