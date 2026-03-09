import { createClient } from "npm:@supabase/supabase-js@2";

function getAnonClientWithAuth(req: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("SUPABASE_URL is not configured");

  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!anon) throw new Error("SUPABASE_ANON_KEY is not configured");

  const authHeader = req.headers.get("Authorization") || "";

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  return createClient(url, anon, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

export async function getClaims(req: Request) {
  const client = getAnonClientWithAuth(req);
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  // Important: validates JWT with signing keys, avoids "Invalid JWT" issues when verify_jwt is true.
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    throw new Error("Unauthorized");
  }
  return { client, claims: data.claims };
}

export function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("SUPABASE_URL is not configured");

  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

  return createClient(url, service);
}

export async function assertAdmin(req: Request) {
  console.log("assertAdmin: Starting admin check");
  const { claims } = await getClaims(req);
  const userId = String(claims.sub);
  console.log("assertAdmin: User ID:", userId);

  // Use service client to bypass RLS when checking user_roles
  const service = getServiceClient();

  console.log("assertAdmin: Checking user_roles for user:", userId);
  const { data: roles, error } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  console.log("assertAdmin: Query result - roles:", roles, "error:", error);

  if (error) throw new Error(`Role check failed: ${error.message}`);
  if (!roles) throw new Error("Forbidden: admin only");

  console.log("assertAdmin: User is admin, proceeding");
  return { userId };
}

/**
 * Verifies that the authenticated user owns a specific resource.
 * Prevents Insecure Direct Object Reference (IDOR) attacks.
 * 
 * @param service - Supabase service client
 * @param table - Table name to check
 * @param resourceId - ID of the resource
 * @param userId - Authenticated user's ID
 * @param userIdColumn - Column name that holds the owner's user_id (default: 'user_id')
 * @returns The resource row if ownership is confirmed
 * @throws Error with "Forbidden" message if ownership check fails
 */
export async function assertOwnership(
  service: ReturnType<typeof getServiceClient>,
  table: string,
  resourceId: string,
  userId: string,
  userIdColumn = "user_id",
) {
  const { data, error } = await service
    .from(table)
    .select("*")
    .eq("id", resourceId)
    .single();

  if (error || !data) {
    throw new Error("Not found");
  }

  if ((data as Record<string, unknown>)[userIdColumn] !== userId) {
    throw new Error("Forbidden: you do not own this resource");
  }

  return data;
}

/**
 * Maps known error messages to appropriate HTTP status codes.
 */
export function errorToStatus(msg: string): number {
  if (msg === "Unauthorized") return 401;
  if (msg.startsWith("Forbidden")) return 403;
  if (msg === "Not found") return 404;
  return 500;
}
