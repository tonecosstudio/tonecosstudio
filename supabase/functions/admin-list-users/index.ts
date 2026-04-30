import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import {
  assertAdmin,
  errorToStatus,
  getServiceClient,
} from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    await assertAdmin(req);
    const service = getServiceClient();

    const { data: authUsers, error: usersError } =
      await service.auth.admin.listUsers();
    if (usersError) throw usersError;

    const userIds = authUsers.users.map((u) => u.id);
    const { data: profiles, error: profilesError } = await service
      .from("profiles")
      .select("id, full_name, phone, whatsapp, cpf, profile_completion")
      .in("id", userIds);

    if (profilesError) {
      console.error("Erro ao buscar profiles:", profilesError.message);
    }

    const { data: roles, error: rolesError } = await service
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    if (rolesError) {
      console.error("Erro ao buscar roles:", rolesError.message);
    }

    const profilesMap = new Map();
    (profiles || []).forEach((profile) => profilesMap.set(profile.id, profile));

    const rolesMap = new Map();
    (roles || []).forEach((roleRow) => {
      const userRoles = rolesMap.get(roleRow.user_id) || [];
      userRoles.push(roleRow.role);
      rolesMap.set(roleRow.user_id, userRoles);
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
    console.error("Erro ao listar usuarios:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: errorToStatus(message),
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
