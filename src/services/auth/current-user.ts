import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export async function getCurrentAuthUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    // Missing sessions are legitimate guests. Service failures are not sign-outs.
    if (error.name === "AuthSessionMissingError") return null;
    throw error;
  }

  return user ?? null;
}

export async function getCurrentUserId(): Promise<string | null> {
  return (await getCurrentAuthUser())?.id ?? null;
}

export async function requireAuthenticatedUserId(): Promise<string> {
  const user = await getCurrentAuthUser();

  if (!user) {
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

async function checkAdminAccessForUserId(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  if (error) {
    throw error;
  }

  return data === true;
}

export async function currentUserHasAdminAccess(): Promise<boolean> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return false;
  }

  return checkAdminAccessForUserId(userId);
}

export async function requireCurrentUserAdminAccess(): Promise<string> {
  const userId = await requireAuthenticatedUserId();
  const isAdmin = await checkAdminAccessForUserId(userId);

  if (!isAdmin) {
    throw new Error("Admin access required");
  }

  return userId;
}
