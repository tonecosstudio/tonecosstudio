import { getCorsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertRateLimitedAdmin } from "../_shared/admin-rate-limit.ts";
import { errorToStatus } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  const corsHeaders = getCorsHeaders(req);

  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const admin = await assertRateLimitedAdmin(req, "admin-list-users");
    if (admin.rateLimited) return admin.rateLimited;

    const { data, error: directoryError } = await admin.client.rpc(
      "tonart_admin_profiles_directory",
      { p_limit: 100, p_offset: 0 },
    );
    if (directoryError) throw directoryError;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Invalid profile directory response");
    }
    const directory = data as Record<string, unknown>;
    if (!Array.isArray(directory.rows)) {
      throw new Error("Invalid profile directory rows");
    }

    const users = directory.rows.map((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Invalid profile directory row");
      }
      const row = value as Record<string, unknown>;
      return {
        id: row.id,
        email: row.email,
        created_at: row.createdAt,
        last_sign_in_at: null,
        confirmed_at: null,
        email_confirmed_at: null,
        phone: row.phone,
        profile: {
          id: row.id,
          full_name: row.fullName,
          phone: row.phone,
          whatsapp: row.whatsapp,
          cpf: row.cpf,
          profile_completion: row.profileCompletion,
        },
        roles: row.isAdmin ? ["admin"] : [],
      };
    });

    return new Response(JSON.stringify({ users, total: directory.total }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    const status = errorToStatus(message);
    console.error("Erro ao listar usuarios:", message);
    return new Response(
      JSON.stringify({
        error: status >= 500 ? "Internal server error" : message,
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
