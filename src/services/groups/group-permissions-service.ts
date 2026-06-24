import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import {
  assertCurrentUserId,
  currentUserHasAdminAccess,
  getCurrentUserId,
} from "@/services/auth/current-user";

async function resolveCurrentUserId(userId?: string): Promise<string | null> {
  if (userId) {
    return assertCurrentUserId(userId);
  }

  return getCurrentUserId();
}

export async function isAdmin(): Promise<boolean> {
  try {
    const uid = await getCurrentUserId();

    if (!uid) {
      return false;
    }

    return currentUserHasAdminAccess();
  } catch (error) {
    log.error("Erro ao verificar permissao administrativa", { error });
    return false;
  }
}

export async function isGroupMember(
  groupId: string,
  userId?: string,
): Promise<boolean> {
  try {
    const uid = await resolveCurrentUserId(userId);

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
    log.error("Erro ao verificar associacao ao grupo", {
      error,
      groupId,
      userId,
    });
    return false;
  }
}

export async function canManageGroup(
  groupId: string,
  userId?: string,
): Promise<boolean> {
  try {
    const uid = await resolveCurrentUserId(userId);

    if (!uid) {
      return false;
    }

    return await isAdmin();
  } catch (error) {
    log.error("Erro ao verificar permissao de gerenciamento do grupo", {
      error,
      groupId,
      userId,
    });
    return false;
  }
}

export async function canSendGroupMessage(
  groupId: string,
  userId?: string,
): Promise<boolean> {
  try {
    const uid = await resolveCurrentUserId(userId);

    if (!uid) {
      return false;
    }

    return await isAdmin();
  } catch (error) {
    log.error("Erro ao verificar permissao de envio de mensagem no grupo", {
      error,
      groupId,
      userId,
    });
    return false;
  }
}

export async function canViewGroupMessages(
  groupId: string,
  userId?: string,
): Promise<boolean> {
  try {
    const uid = await resolveCurrentUserId(userId);

    if (!uid) {
      return false;
    }

    const admin = await isAdmin();
    if (admin) {
      return true;
    }

    return await isGroupMember(groupId, uid);
  } catch (error) {
    log.error(
      "Erro ao verificar permissao de visualizacao de mensagens do grupo",
      {
        error,
        groupId,
        userId,
      },
    );
    return false;
  }
}

export async function canDeleteGroup(
  groupId: string,
  userId?: string,
): Promise<boolean> {
  try {
    const uid = await resolveCurrentUserId(userId);

    if (!uid) {
      return false;
    }

    return await isAdmin();
  } catch (error) {
    log.error("Erro ao verificar permissao de exclusao do grupo", {
      error,
      groupId,
      userId,
    });
    return false;
  }
}

export async function requireAdmin(): Promise<void> {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error(
      "Acesso negado: apenas administradores podem realizar esta acao",
    );
  }
}

export async function requireGroupMember(
  groupId: string,
  userId?: string,
): Promise<void> {
  const member = await isGroupMember(groupId, userId);
  if (!member) {
    throw new Error("Acesso negado: voce nao e membro deste grupo");
  }
}

export async function requireGroupManagement(
  groupId: string,
  userId?: string,
): Promise<void> {
  const canManage = await canManageGroup(groupId, userId);
  if (!canManage) {
    throw new Error(
      "Acesso negado: voce nao tem permissao para gerenciar este grupo",
    );
  }
}
