/**
 * Rate Limiting Service
 * 
 * Implements rate limiting to prevent abuse and DDoS attacks.
 * Uses in-memory storage for simplicity. For production with multiple
 * servers, use Redis or similar distributed cache.
 * 
 * Features:
 * - Token bucket algorithm
 * - Per-user and per-IP rate limiting
 * - Different limits for different endpoints
 * - Automatic cleanup of old entries
 */

import { errorTracking, ErrorSeverity } from '@/lib/error-tracking';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
  message?: string; // Custom error message
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Rate limiter store
 */
class RateLimiterStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Cleanup old entries every 5 minutes
    this.startCleanup();
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetTime < now) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get entry for key
   */
  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }

  /**
   * Set entry for key
   */
  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  /**
   * Delete entry for key
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get store size
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Get a snapshot of all entries.
   */
  entries(): RateLimitEntry[] {
    return Array.from(this.store.values());
  }
}

// Global store instance
const store = new RateLimiterStore();

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number; // Seconds until reset
}

/**
 * Check rate limit for a key
 * 
 * @param key - Unique identifier (user ID, IP address, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // No entry or expired entry
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.windowMs;
    store.set(key, {
      count: 1,
      resetTime
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime
    };
  }

  // Entry exists and not expired
  if (entry.count < config.maxRequests) {
    entry.count++;
    store.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  // Rate limit exceeded
  const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

  errorTracking.log(
    `Rate limit exceeded for key: ${key}`,
    ErrorSeverity.WARNING,
    { key, config, entry }
  );

  return {
    allowed: false,
    remaining: 0,
    resetTime: entry.resetTime,
    retryAfter
  };
}

/**
 * Reset rate limit for a key
 * 
 * @param key - Unique identifier
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Clear all rate limits
 */
export function clearAllRateLimits(): void {
  store.clear();
}

/**
 * Get rate limiter statistics
 */
export function getRateLimiterStats(): {
  totalKeys: number;
  activeKeys: number;
} {
  const now = Date.now();
  let activeKeys = 0;

  for (const entry of store.entries()) {
    if (entry && entry.resetTime > now) {
      activeKeys++;
    }
  }

  return {
    totalKeys: store.size,
    activeKeys
  };
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMITS = {
  // Authentication endpoints
  login: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },

  register: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Muitas tentativas de registro. Tente novamente em 1 hora.'
  },

  passwordReset: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Muitas solicitações de redefinição de senha. Tente novamente em 1 hora.'
  },

  // API endpoints
  api: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Muitas requisições. Tente novamente em alguns minutos.'
  },

  apiStrict: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'Muitas requisições. Aguarde 1 minuto.'
  },

  // File uploads
  upload: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Muitos uploads. Tente novamente em 1 hora.'
  },

  // Search
  search: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    message: 'Muitas buscas. Aguarde 1 minuto.'
  },

  // Email sending
  email: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Muitos emails enviados. Tente novamente em 1 hora.'
  },

  // Payment operations
  payment: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    message: 'Muitas operações de pagamento. Aguarde 1 minuto.'
  },

  // Admin operations
  admin: {
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Muitas operações administrativas. Aguarde alguns minutos.'
  },
} as const;

/**
 * Rate limit middleware for React Query
 * 
 * @param key - Unique identifier
 * @param config - Rate limit configuration
 * @returns Function that checks rate limit before query
 */
export function withRateLimit<T>(
  key: string,
  config: RateLimitConfig
): (fn: () => Promise<T>) => Promise<T> {
  return async (fn: () => Promise<T>): Promise<T> => {
    const result = checkRateLimit(key, config);

    if (!result.allowed) {
      throw new Error(
        config.message || `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`
      );
    }

    return fn();
  };
}

/**
 * Get rate limit key for user
 * 
 * @param userId - User ID
 * @param action - Action name
 * @returns Rate limit key
 */
export function getUserRateLimitKey(userId: string, action: string): string {
  return `user:${userId}:${action}`;
}

/**
 * Get rate limit key for IP
 * 
 * @param ip - IP address
 * @param action - Action name
 * @returns Rate limit key
 */
export function getIPRateLimitKey(ip: string, action: string): string {
  return `ip:${ip}:${action}`;
}

/**
 * Get rate limit key for anonymous user
 * 
 * @param fingerprint - Browser fingerprint or session ID
 * @param action - Action name
 * @returns Rate limit key
 */
export function getAnonymousRateLimitKey(fingerprint: string, action: string): string {
  return `anon:${fingerprint}:${action}`;
}

function getSessionRateLimitFingerprint(): string {
  const fallback = 'session';

  if (typeof window === 'undefined') {
    return fallback;
  }

  const storageKey = 'ordax_rate_limit_fingerprint';
  const webCrypto = globalThis.crypto;
  const fingerprint = webCrypto?.randomUUID
    ? webCrypto.randomUUID()
    : webCrypto?.getRandomValues
      ? Array.from(webCrypto.getRandomValues(new Uint8Array(16)), (byte: number) =>
          byte.toString(16).padStart(2, '0')
        ).join('')
      : `${Date.now()}-${fallback}`;

  try {
    const existing = window.sessionStorage.getItem(storageKey);

    if (existing) {
      return existing;
    }

    window.sessionStorage.setItem(storageKey, fingerprint);
  } catch {
    return fingerprint;
  }

  return fingerprint;
}

/**
 * React hook for rate limiting
 * 
 * @param action - Action name
 * @param config - Rate limit configuration
 * @param subjectKey - User ID or other stable subject key when available
 * @returns Rate limit check function
 */
export function useRateLimit(
  action: string,
  config: RateLimitConfig,
  subjectKey?: string
): {
  checkLimit: () => RateLimitResult;
  resetLimit: () => void;
} {
  const key = subjectKey
    ? getUserRateLimitKey(subjectKey, action)
    : getAnonymousRateLimitKey(getSessionRateLimitFingerprint(), action);

  return {
    checkLimit: () => checkRateLimit(key, config),
    resetLimit: () => resetRateLimit(key)
  };
}

/**
 * Cleanup function for tests
 */
export function cleanup(): void {
  store.stopCleanup();
  store.clear();
}
