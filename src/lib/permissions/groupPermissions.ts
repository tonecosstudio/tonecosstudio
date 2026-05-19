import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";

async function resolveUserId(userId?: string): Promise<string | null> {
  if (userId) {
    return userId;
  }

  return (await supabase.auth.getUser()).data.user?.id ?? null;
}

export async function isAdmin(userId?: string): Promise<boolean> {
  try {
    const uid = await resolveUserId(userId);

    if (!uid) {
      return false;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .single();

    if (error || !profile) {
      return false;
    }

    return profile.role === "admin";
  } catch (error) {
    log.error("Erro ao verificar permissão administrativa", { error, userId });
    return false;
  }
}

export async function isGroupMember(groupId: string, userId?: string): Promise<boolean> {
  try {
    const uid = await resolveUserId(userId);

    if (!uid) {
      return false;
    }

    const { data, error } = await supabase
      .from("chat_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", uid)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return true;
  } catch (error) {
    log.error("Erro ao verificar associação ao grupo", { error, groupId, userId });
    return false;
  }
}

export async function canManageGroup(groupId: string, userId?: string): Promise<boolean> {
  try {
    const uid = await resolveUserId(userId);

    if (!uid) {
      return false;
    }

    return await isAdmin(uid);
  } catch (error) {
    log.error("Erro ao verificar permissão de gerenciamento do grupo", { error, groupId, userId });
    return false;
  }
}

export async function canSendGroupMessage(groupId: string, userId?: string): Promise<boolean> {
  try {
    const uid = await resolveUserId(userId);

    if (!uid) {
      return false;
    }

    return await isAdmin(uid);
  } catch (error) {
    log.error("Erro ao verificar permissão de envio de mensagem no grupo", {
      error,
      groupId,
      userId,
    });
    return false;
  }
}

export async function canViewGroupMessages(groupId: string, userId?: string): Promise<boolean> {
  try {
    const uid = await resolveUserId(userId);

    if (!uid) {
      return false;
    }

    const admin = await isAdmin(uid);
    if (admin) {
      return true;
    }

    return await isGroupMember(groupId, uid);
  } catch (error) {
    log.error("Erro ao verificar permissão de visualização de mensagens do grupo", {
      error,
      groupId,
      userId,
    });
    return false;
  }
}

export async function canDeleteGroup(groupId: string, userId?: string): Promise<boolean> {
  try {
    const uid = await resolveUserId(userId);

    if (!uid) {
      return false;
    }

    return await isAdmin(uid);
  } catch (error) {
    log.error("Erro ao verificar permissão de exclusão do grupo", { error, groupId, userId });
    return false;
  }
}

export async function requireAdmin(userId?: string): Promise<void> {
  const admin = await isAdmin(userId);
  if (!admin) {
    throw new Error("Acesso negado: apenas administradores podem realizar esta ação");
  }
}

export async function requireGroupMember(groupId: string, userId?: string): Promise<void> {
  const member = await isGroupMember(groupId, userId);
  if (!member) {
    throw new Error("Acesso negado: você não é membro deste grupo");
  }
}

export async function requireGroupManagement(groupId: string, userId?: string): Promise<void> {
  const canManage = await canManageGroup(groupId, userId);
  if (!canManage) {
    throw new Error("Acesso negado: você não tem permissão para gerenciar este grupo");
  }
}
