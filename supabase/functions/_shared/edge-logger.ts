type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const REDACTED_VALUE = "[REDACTED]";
const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 25;
const MAX_OBJECT_KEYS = 50;
const MAX_STRING_LENGTH = 512;
const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|jwt|password|secret|service[_-]?role|session|token|api[_-]?key|apikey)/i;
const SENSITIVE_STRING_PATTERNS: Array<[RegExp, string]> = [
  [/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[REDACTED]"],
  [
    /((?:api[_-]?key|apikey|password|secret|service[_-]?role|token)\s*[:=]\s*)[^\s,;"]+/gi,
    "$1[REDACTED]",
  ],
  [
    /([?&](?:access_token|api[_-]?key|apikey|password|refresh_token|secret|token)=)[^&\s]+/gi,
    "$1[REDACTED]",
  ],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_JWT]"],
];

function redactSensitiveString(value: string) {
  return SENSITIVE_STRING_PATTERNS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    value,
  );
}

function truncate(value: string) {
  const redacted = redactSensitiveString(value);
  return redacted.length > MAX_STRING_LENGTH
    ? `${redacted.slice(0, MAX_STRING_LENGTH)}...`
    : redacted;
}

function sanitizeError(error: Error) {
  return {
    name: error.name,
    message: truncate(error.message),
    stack: error.stack ? truncate(error.stack) : undefined,
  };
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") return truncate(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Error) return sanitizeError(value);

  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) return `[Array(${value.length})]`;
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    if (depth >= MAX_DEPTH) return "[Object]";

    const sanitized: LogContext = {};
    for (const [key, item] of Object.entries(value).slice(0, MAX_OBJECT_KEYS)) {
      sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? REDACTED_VALUE
        : sanitizeValue(item, depth + 1);
    }
    return sanitized;
  }

  return String(value);
}

function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  return sanitizeValue(context) as LogContext;
}

function write(
  level: LogLevel,
  source: string,
  event: string,
  context?: LogContext,
) {
  const payload = sanitizeContext(context);
  const message = `[${source}] ${event}`;

  if (payload) {
    console[level](message, payload);
    return;
  }

  console[level](message);
}

export function createEdgeLogger(source: string) {
  return {
    info(event: string, context?: LogContext) {
      write("info", source, event, context);
    },
    warn(event: string, context?: LogContext) {
      write("warn", source, event, context);
    },
    error(event: string, context?: LogContext) {
      write("error", source, event, context);
    },
  };
}
