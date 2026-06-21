import { checkRateLimit, RATE_LIMITS } from "./rate-limit.ts";
import { requireSharedSecret } from "./secrets.ts";

type SecretRateLimitConfig = {
  maxRequests: number;
  windowSeconds: number;
};

export async function requireRateLimitedSharedSecret(
  req: Request,
  envName: string,
  headerName: string,
  endpoint: string,
  config: SecretRateLimitConfig = RATE_LIMITS.STANDARD,
): Promise<Response | null> {
  const forbidden = requireSharedSecret(req, envName, headerName);
  if (forbidden) return forbidden;

  return await checkRateLimit(req, endpoint, config);
}
