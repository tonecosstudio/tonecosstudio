import { supabase } from "@/integrations/supabase/client";

export async function requireAuthenticatedUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("User not authenticated");
  }

  return user.id;
}

export async function assertCurrentUserId(userId: string): Promise<string> {
  const currentUserId = await requireAuthenticatedUserId();

  if (userId !== currentUserId) {
    throw new Error("Acesso negado ao usuario informado");
  }

  return currentUserId;
}

export async function userHasAdminAccess(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  if (error) {
    return false;
  }

  return data === true;
}
