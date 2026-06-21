import { getCorsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertRateLimitedAdmin } from "../_shared/admin-rate-limit.ts";
import { errorToStatus, getServiceClient } from "../_shared/supabase.ts";

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

    const service = getServiceClient();

    const { data: authUsers, error: usersError } =
      await service.auth.admin.listUsers();
    if (usersError) throw usersError;

    const userIds = authUsers.users.map((u) => u.id);
    const { data: profiles, error: profilesError } = await service
      .from("profiles")
      .select("id, full_name, phone, whatsapp, cpf, profile_completion, role")
      .in("id", userIds);

    if (profilesError) {
      console.error("Erro ao buscar profiles:", profilesError.message);
    }

    const profilesMap = new Map();
    (profiles || []).forEach((profile) => profilesMap.set(profile.id, profile));

    const rolesMap = new Map();
    (profiles || []).forEach((profile) => {
      rolesMap.set(profile.id, profile.role ? [profile.role] : []);
    });

    const users = authUsers.users.map((user) => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      confirmed_at: user.confirmed_at,
      email_confirmed_at: user.email_confirmed_at,
      phone: user.phone,
      profile: profilesMap.get(user.id) || null,
      roles: rolesMap.get(user.id) || [],
    }));

    return new Response(JSON.stringify({ users }), {
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
