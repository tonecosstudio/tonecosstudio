import { createClient } from "npm:@supabase/supabase-js@2";
import { logAuthFailure, logPermissionDenied } from "./security-logger.ts";

function getAnonClientWithAuth(req: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("SUPABASE_URL is not configured");

  const anon =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
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

/** Public data reads use only the anon/publishable key and remain subject to RLS. */
export function getPublicAnonClient() {
  const url = getSupabaseUrl();
  const anon =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!anon) throw new Error("SUPABASE_ANON_KEY is not configured");

  return createClient(url, anon, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function getSupabaseUrl() {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("SUPABASE_URL is not configured");
  return url;
}

function getServiceRoleKey() {
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return service;
}

export function hasServiceRoleAuthorization(req: Request): boolean {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  return authorization === `Bearer ${getServiceRoleKey()}`;
}

export async function getClaims(req: Request) {
  const client = getAnonClientWithAuth(req);
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  // Important: validates JWT with signing keys, avoids "Invalid JWT" issues when verify_jwt is true.
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    logAuthFailure(
      req,
      new URL(req.url).pathname,
      error?.message ?? "missing sub claim",
    );
    throw new Error("Unauthorized");
  }
  return { client, claims: data.claims };
}

export function getServiceClient() {
  return createClient(getSupabaseUrl(), getServiceRoleKey());
}

/** Private, non-reversible rate key used for public TONART inquiries. */
export async function createPrivateRateFingerprint(value: string): Promise<string> {
  const material = new TextEncoder().encode(getServiceRoleKey() + ":tonart-quote-rate:" + value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", material));
  return Array.from(digest).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function callServiceRoleFunction(
  functionName: string,
  body: unknown,
  init: Omit<RequestInit, "body" | "method"> = {},
): Promise<Response> {
  if (!/^[a-z0-9-]+$/.test(functionName)) {
    throw new Error("Invalid Supabase function name");
  }

  const headers = new Headers(init.headers);
  headers.set(
    "Content-Type",
    headers.get("Content-Type") ?? "application/json",
  );
  headers.set("Authorization", `Bearer ${getServiceRoleKey()}`);

  return fetch(`${getSupabaseUrl()}/functions/v1/${functionName}`, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

export async function assertAdmin(req: Request) {
  const { client, claims } = await getClaims(req);
  const userId = String(claims.sub);
  const { data: isAdmin, error } = await client.rpc("is_tonecos_admin");
  if (error) throw new Error(`Role check failed: ${error.message}`);
  if (isAdmin !== true) {
    logPermissionDenied(
      req,
      new URL(req.url).pathname,
      userId,
      "admin role required",
    );
    throw new Error("Forbidden: admin only");
  }

  return { userId, role: "admin" as const, client };
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
