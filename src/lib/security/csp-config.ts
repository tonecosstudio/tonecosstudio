/**
 * Content Security Policy (CSP) Configuration
 * 
 * Implements strict CSP headers to prevent XSS, clickjacking,
 * and other code injection attacks.
 * 
 * CSP Directives:
 * - default-src: Fallback for other directives
 * - script-src: JavaScript sources
 * - style-src: CSS sources
 * - img-src: Image sources
 * - font-src: Font sources
 * - connect-src: AJAX, WebSocket, EventSource
 * - frame-ancestors: Embedding in iframes
 * - base-uri: <base> tag URLs
 * - form-action: Form submission targets
 */

/**
 * CSP Configuration for different environments
 */
export const CSP_CONFIG = {
  development: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Needed for Vite HMR in dev
      "'unsafe-eval'", // Needed for Vite in dev
      'https://cdn.jsdelivr.net', // For external libraries
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Needed for styled-components, Tailwind
      'https://fonts.googleapis.com',
    ],
    'img-src': [
      "'self'",
      'data:', // For inline images
      'blob:', // For object URLs
      'https:', // Allow all HTTPS images in dev
    ],
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
    ],
    'connect-src': [
      "'self'",
      'http://localhost:*', // Vite dev server
      'ws://localhost:*', // Vite HMR
      'wss://localhost:*',
      'https://*.supabase.co', // Supabase
      'wss://*.supabase.co', // Supabase Realtime
    ],
    'frame-ancestors': ["'none'"], // Prevent clickjacking
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"], // Disable plugins
    'upgrade-insecure-requests': [], // Upgrade HTTP to HTTPS
  },

  production: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      // Add nonce or hash for inline scripts
      // "'nonce-{NONCE}'", // Generated per request
      'https://cdn.jsdelivr.net',
      'https://js.sentry-cdn.com', // Sentry
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Unfortunately needed for Tailwind/styled-components
      'https://fonts.googleapis.com',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://*.supabase.co', // Supabase Storage
      'https://ordax.com.br', // Your domain
    ],
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
    ],
    'connect-src': [
      "'self'",
      'https://*.supabase.co', // Supabase API
      'wss://*.supabase.co', // Supabase Realtime
      'https://sentry.io', // Sentry
      'https://ordax.com.br', // Your API
    ],
    'frame-ancestors': ["'none'"], // Prevent clickjacking
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
    'upgrade-insecure-requests': [],
    'block-all-mixed-content': [], // Block HTTP content on HTTPS pages
  },
};

/**
 * Generate CSP header string
 * 
 * @param environment - 'development' or 'production'
 * @returns CSP header string
 */
export function generateCSPHeader(environment: 'development' | 'production' = 'production'): string {
  const config = CSP_CONFIG[environment];
  
  return Object.entries(config)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  // Content Security Policy
  'Content-Security-Policy': generateCSPHeader(
    import.meta.env.DEV ? 'development' : 'production'
  ),

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Enable XSS filter (legacy browsers)
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy (formerly Feature Policy)
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()', // Disable FLoC
    'payment=()',
    'usb=()',
  ].join(', '),

  // Strict Transport Security (HTTPS only)
  // Only enable in production with HTTPS
  ...(import.meta.env.PROD && {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  }),
};

/**
 * Apply security headers to response
 * 
 * For use in Supabase Edge Functions or API routes
 * 
 * @param headers - Existing headers object
 * @returns Headers with security headers added
 */
export function applySecurityHeaders(headers: Headers = new Headers()): Headers {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return headers;
}

/**
 * Generate nonce for inline scripts
 * Used with CSP script-src 'nonce-{NONCE}'
 * 
 * @returns Random nonce string
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * CORS configuration
 */
export const CORS_CONFIG = {
  development: {
    origin: ['http://localhost:8080', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400, // 24 hours
  },

  production: {
    origin: ['https://ordax.com.br', 'https://www.ordax.com.br'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
  },
};

/**
 * Apply CORS headers to response
 * 
 * @param headers - Existing headers object
 * @param origin - Request origin
 * @returns Headers with CORS headers added
 */
export function applyCORSHeaders(
  headers: Headers = new Headers(),
  origin?: string
): Headers {
  const config = CORS_CONFIG[import.meta.env.DEV ? 'development' : 'production'];

  // Check if origin is allowed
  if (origin && config.origin.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  } else if (config.origin.length === 1) {
    headers.set('Access-Control-Allow-Origin', config.origin[0]);
  }

  headers.set('Access-Control-Allow-Methods', config.methods.join(', '));
  headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
  headers.set('Access-Control-Max-Age', config.maxAge.toString());

  if (config.credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return headers;
}
