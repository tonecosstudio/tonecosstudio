import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { requireCurrentUserAdminAccess } from "@/services/auth/current-user";
import type { GroupType, MembershipCriteria } from "@/types/groups";

interface ValidationResult {
  valid: boolean;
  error?: string;
}

const VALID_GROUP_TYPES: GroupType[] = [
  "manual",
  "assinantes",
  "colecao",
  "lancamentos",
  "pedidos",
];

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export async function validateCollectionExists(
  collectionId: string,
): Promise<ValidationResult> {
  try {
    const { data, error } = await supabase
      .from("collections")
      .select("id")
      .eq("id", collectionId)
      .single();

    if (error || !data) {
      return {
        valid: false,
        error: "Coleção não encontrada",
      };
    }

    return { valid: true };
  } catch (error) {
    log.error("Erro ao validar coleção", { error, collectionId });
    return {
      valid: false,
      error: "Erro ao validar coleção",
    };
  }
}

export async function validateUserExists(
  userId: string,
): Promise<ValidationResult> {
  try {
    await requireCurrentUserAdminAccess();

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return {
        valid: false,
        error: "Usuário não encontrado",
      };
    }

    return { valid: true };
  } catch (error) {
    log.error("Erro ao validar usuário", { error, userId });
    return {
      valid: false,
      error: "Erro ao validar usuário",
    };
  }
}

export function validateGroupName(name: string): ValidationResult {
  if (!name || name.trim().length < 3) {
    return {
      valid: false,
      error: "Nome do grupo deve ter pelo menos 3 caracteres",
    };
  }

  if (name.length > 100) {
    return {
      valid: false,
      error: "Nome do grupo deve ter no máximo 100 caracteres",
    };
  }

  return { valid: true };
}

export function validateMessage(message: string): ValidationResult {
  if (!message || message.trim().length < 1) {
    return {
      valid: false,
      error: "Mensagem não pode estar vazia",
    };
  }

  if (message.length > 5000) {
    return {
      valid: false,
      error: "Mensagem não pode ter mais de 5000 caracteres",
    };
  }

  return { valid: true };
}

export function validateGroupType(type: string): ValidationResult {
  if (!VALID_GROUP_TYPES.includes(type as GroupType)) {
    return {
      valid: false,
      error: "Tipo de grupo inválido",
    };
  }

  return { valid: true };
}

export function validateMembershipCriteria(
  type: GroupType,
  criteria: MembershipCriteria,
): ValidationResult {
  if (type === "manual" && criteria !== null) {
    return {
      valid: false,
      error: "Grupos manuais não devem ter critérios de associação",
    };
  }

  if (type !== "manual" && !criteria) {
    return {
      valid: false,
      error: "Grupos automáticos devem ter critérios de associação",
    };
  }

  if (
    type === "colecao" &&
    criteria?.type === "colecao" &&
    !criteria.collectionId
  ) {
    return {
      valid: false,
      error: "Grupos de coleção devem especificar um ID de coleção",
    };
  }

  return { valid: true };
}

export async function validateGroupNameUnique(
  name: string,
  excludeGroupId?: string,
): Promise<ValidationResult> {
  try {
    let query = supabase
      .from("chat_groups")
      .select("id")
      .eq("name", name)
      .is("deleted_at", null);

    if (excludeGroupId) {
      query = query.neq("id", excludeGroupId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== "PGRST116") {
      log.error("Erro ao verificar unicidade do nome do grupo", {
        error,
        name,
        excludeGroupId,
      });
      return {
        valid: false,
        error: "Erro ao validar nome do grupo",
      };
    }

    if (data) {
      return {
        valid: false,
        error: "Já existe um grupo com este nome",
      };
    }

    return { valid: true };
  } catch (error) {
    log.error("Erro ao validar unicidade do nome do grupo", {
      error,
      name,
      excludeGroupId,
    });
    return {
      valid: false,
      error: "Erro ao validar nome do grupo",
    };
  }
}

export function validateAttachment(file: File): ValidationResult {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return {
      valid: false,
      error: "Arquivo muito grande. Tamanho máximo: 10MB",
    };
  }

  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Tipo de arquivo não permitido",
    };
  }

  return { valid: true };
}
