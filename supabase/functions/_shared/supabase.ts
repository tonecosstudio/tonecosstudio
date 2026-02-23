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
