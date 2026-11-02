import { APP_ROUTES } from "./routes";
import { BRAND_NAME } from "./brand";

/**
 * Runtime constants that are safe to define in the browser bundle.
 *
 * Commercial prices, deposits, PIX discounts and coin monetary values are NOT
 * configured here. Those values must come from the database-backed SSOT and
 * fail closed when unavailable.
 */

export const ENV = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
  SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
  APP_VERSION: import.meta.env.VITE_APP_VERSION || "0.1.0",
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
} as const;

export const PRICING = {
  // Non-monetary operational limits. Actual commercial values live in the DB.
  COIN_EXCHANGE_REFERENCE_COINS: Math.max(
    1,
    Number(import.meta.env.VITE_COIN_EXCHANGE_REFERENCE_COINS) || 100,
  ),
  MAX_INSTALLMENTS_NO_INTEREST: Math.max(
    1,
    Number(import.meta.env.VITE_MAX_INSTALLMENTS_NO_INTEREST) || 6,
  ),
  MAX_INSTALLMENTS_WITH_INTEREST: Math.max(
    1,
    Number(import.meta.env.VITE_MAX_INSTALLMENTS_WITH_INTEREST) || 10,
  ),
} as const;

export const BATCH = {
  SHIPPING_BUSINESS_DAYS:
    Number(import.meta.env.VITE_SHIPPING_BUSINESS_DAYS) || 5,
  CYCLES_PER_MONTH: 2,
  CYCLE1_START_DAY: 1,
  CYCLE1_END_DAY: 15,
  CYCLE2_START_DAY: 16,
  EXCHANGE_DEADLINE_DAYS:
    Number(import.meta.env.VITE_EXCHANGE_DEADLINE_DAYS) || 1,
  FUTURE_BATCHES_COUNT: Number(import.meta.env.VITE_FUTURE_BATCHES_COUNT) || 12,
  PRODUCTION_DAYS_MIN: Number(import.meta.env.VITE_PRODUCTION_DAYS_MIN) || 15,
  PRODUCTION_DAYS_MAX: Number(import.meta.env.VITE_PRODUCTION_DAYS_MAX) || 20,
  SALES_DURATION_DAYS: Number(import.meta.env.VITE_SALES_DURATION_DAYS) || 30,
  DELIVERY_INTERVAL_DAYS:
    Number(import.meta.env.VITE_DELIVERY_INTERVAL_DAYS) || 90,
  BALANCE_PAYMENT_DAYS: Number(import.meta.env.VITE_BALANCE_PAYMENT_DAYS) || 5,
  MONTHLY_PRODUCTION_LIMIT:
    Number(import.meta.env.VITE_MONTHLY_PRODUCTION_LIMIT) || 20,
  SALES_OPEN_DAY: Number(import.meta.env.VITE_SALES_OPEN_DAY) || 15,
} as const;

export const ASSETS = {
  DEFAULT_ICON_URL: "/favicon.ico",
  FALLBACK_IMAGE_URL: "/image-fallback.svg",
} as const;

export const CONTACT = {
  SUPPORT_EMAIL: import.meta.env.VITE_SUPPORT_EMAIL || "",
  CONTACT_EMAIL: import.meta.env.VITE_CONTACT_EMAIL || "",
  PRIVACY_EMAIL: import.meta.env.VITE_PRIVACY_EMAIL || "",
  DPO_EMAIL: import.meta.env.VITE_DPO_EMAIL || "",
  WEBSITE_URL:
    import.meta.env.VITE_WEBSITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : ""),
  COMPANY_LOGO_URL:
    import.meta.env.VITE_COMPANY_LOGO_URL || ASSETS.DEFAULT_ICON_URL,
  BUSINESS_HOURS:
    import.meta.env.VITE_BUSINESS_HOURS || "Segunda a Sexta, 9h às 18h",
  COMPANY_NAME: import.meta.env.VITE_COMPANY_NAME || BRAND_NAME,
  LEGAL_NAME: import.meta.env.VITE_LEGAL_NAME || "",
  COMPANY_ADDRESS: import.meta.env.VITE_COMPANY_ADDRESS || "",
} as const;

export const NOTIFICATIONS = {
  USER_ONLINE_THRESHOLD_MINUTES:
    Number(import.meta.env.VITE_USER_ONLINE_THRESHOLD) || 5,
  POLLING_INTERVAL_MS:
    Number(import.meta.env.VITE_NOTIFICATION_POLLING_INTERVAL) || 30000,
  TOAST_DURATION_MS: Number(import.meta.env.VITE_TOAST_DURATION) || 5000,
} as const;

export const UI = {
  DEFAULT_PAGE_SIZE: Number(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 20,
  ITEMS_PER_PAGE_OPTIONS: [10, 20, 50, 100],
  SEARCH_DEBOUNCE_MS: Number(import.meta.env.VITE_SEARCH_DEBOUNCE) || 300,
  INPUT_DEBOUNCE_MS: Number(import.meta.env.VITE_INPUT_DEBOUNCE) || 500,
  LAZY_LOAD_THRESHOLD: Number(import.meta.env.VITE_LAZY_LOAD_THRESHOLD) || 100,
  IMAGE_COMPRESSION_QUALITY:
    Number(import.meta.env.VITE_IMAGE_COMPRESSION_QUALITY) || 0.8,
  MAX_IMAGE_SIZE_MB: Number(import.meta.env.VITE_MAX_IMAGE_SIZE_MB) || 5,
} as const;

export const SECURITY = {
  MAX_RETRY_ATTEMPTS: Number(import.meta.env.VITE_MAX_RETRY_ATTEMPTS) || 3,
  RETRY_DELAY_MS: Number(import.meta.env.VITE_RETRY_DELAY) || 1000,
  REQUEST_TIMEOUT_MS: Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 30000,
  MAX_REQUESTS_PER_MINUTE:
    Number(import.meta.env.VITE_MAX_REQUESTS_PER_MINUTE) || 60,
} as const;

export const ANALYTICS = {
  ENABLE_DEBUG_LOGS:
    import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true" || ENV.IS_DEVELOPMENT,
} as const;

export const PLANS = {
  TYPES: ["avulso", "mensal", "trimestral", "semestral", "anual"] as const,
  DAYS_TO_NEXT_DELIVERY:
    Number(import.meta.env.VITE_DAYS_TO_NEXT_DELIVERY) || 30,
} as const;

export const LOCALE = {
  DEFAULT_LANGUAGE: import.meta.env.VITE_DEFAULT_LANGUAGE || "pt-BR",
  CURRENCY: import.meta.env.VITE_CURRENCY || "BRL",
  CURRENCY_SYMBOL: import.meta.env.VITE_CURRENCY_SYMBOL || "R$",
  TIMEZONE: import.meta.env.VITE_TIMEZONE || "America/Sao_Paulo",
} as const;

export const ROUTES = APP_ROUTES;

export const THEME = {
  STATUS_COLORS: {
    pending: "yellow",
    processing: "blue",
    completed: "green",
    cancelled: "red",
    failed: "red",
  } as const,
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

export const VALIDATION = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_MESSAGE_LENGTH: 5000,
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  MAX_FILE_SIZE_BYTES: UI.MAX_IMAGE_SIZE_MB * 1024 * 1024,
  MIN_PRICE: 0,
  MAX_PRICE: 999999,
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 1000,
} as const;

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
