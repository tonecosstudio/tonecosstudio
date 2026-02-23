import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar se o usuário que está chamando é admin
    const authHeader = req.headers.get("Authorization");
    
    console.log("Authorization header:", authHeader ? "presente" : "ausente");
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado - header ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Criar cliente com anon key para validar o token do usuário
    const supabaseClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verificar usuário com o token fornecido
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    console.log("User:", user?.id, "Error:", authError?.message);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido", details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar cliente com service_role key para operações admin
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verificar se é admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    console.log("Role data:", roleData, "Error:", roleError?.message);

    if (roleError || roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas admins podem listar usuários." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar todos os usuários (usando service_role)
    const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      throw usersError;
    }

    // Buscar profiles de todos os usuários
    const userIds = authUsers.users.map(u => u.id);
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, whatsapp, cpf, profile_completion")
      .in("id", userIds);

    if (profilesError) {
      console.error("Erro ao buscar profiles:", profilesError);
    }

    // Buscar roles de todos os usuários
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    if (rolesError) {
      console.error("Erro ao buscar roles:", rolesError);
    }

    // Mapear profiles e roles por user_id
    const profilesMap = new Map();
    (profiles || []).forEach(p => profilesMap.set(p.id, p));

    const rolesMap = new Map();
    (roles || []).forEach(r => {
      const userRoles = rolesMap.get(r.user_id) || [];
      userRoles.push(r.role);
      rolesMap.set(r.user_id, userRoles);
    });

    // Combinar dados
    const users = authUsers.users.map(user => ({
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

    return new Response(
      JSON.stringify({ users }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
