import { checkRateLimit, RATE_LIMITS } from "./rate-limit.ts";
import { assertAdmin } from "./supabase.ts";

type AdminRateLimitConfig = {
  maxRequests: number;
  windowSeconds: number;
};

export async function assertRateLimitedAdmin(
  req: Request,
  endpoint: string,
  config: AdminRateLimitConfig = RATE_LIMITS.ADMIN,
) {
  const admin = await assertAdmin(req);
  const rateLimited = await checkRateLimit(req, endpoint, config, admin.userId);

  return {
    ...admin,
    rateLimited,
  };
}
