import { supabase } from '@/integrations/supabase/client';
import type { GroupType, MembershipCriteria } from '@/types/groups';

/**
 * Additional validation utilities for chat groups system
 * Requirements: 1.2, 1.4, 2.2, 5.2, 8.2
 */

/**
 * Validates that a collection exists in the database
 * Requirements: 5.2
 */
export async function validateCollectionExists(
  collectionId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('id')
      .eq('id', collectionId)
      .single();

    if (error || !data) {
      return {
        valid: false,
        error: 'Coleção não encontrada',
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating collection:', error);
    return {
      valid: false,
      error: 'Erro ao validar coleção',
    };
  }
}

/**
 * Validates that a user exists in the database
 * Requirements: 2.2
 */
export async function validateUserExists(
  userId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return {
        valid: false,
        error: 'Usuário não encontrado',
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating user:', error);
    return {
      valid: false,
      error: 'Erro ao validar usuário',
    };
  }
}

/**
 * Validates group name length and format
 * Requirements: 1.2
 */
export function validateGroupName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length < 3) {
    return {
      valid: false,
      error: 'Nome do grupo deve ter pelo menos 3 caracteres',
    };
  }

  if (name.length > 100) {
    return {
      valid: false,
      error: 'Nome do grupo deve ter no máximo 100 caracteres',
    };
  }

  return { valid: true };
}

/**
 * Validates message content length
 * Requirements: 8.2
 */
export function validateMessage(message: string): { valid: boolean; error?: string } {
  if (!message || message.trim().length < 1) {
    return {
      valid: false,
      error: 'Mensagem não pode estar vazia',
    };
  }

  if (message.length > 5000) {
    return {
      valid: false,
      error: 'Mensagem não pode ter mais de 5000 caracteres',
    };
  }

  return { valid: true };
}

/**
 * Validates group type is one of the allowed values
 * Requirements: 1.4
 */
export function validateGroupType(type: string): { valid: boolean; error?: string } {
  const validTypes: GroupType[] = ['manual', 'assinantes', 'colecao', 'lancamentos', 'pedidos'];

  if (!validTypes.includes(type as GroupType)) {
    return {
      valid: false,
      error: 'Tipo de grupo inválido',
    };
  }

  return { valid: true };
}

/**
 * Validates membership criteria based on group type
 * Requirements: 1.4, 5.2
 */
export function validateMembershipCriteria(
  type: GroupType,
  criteria: MembershipCriteria
): { valid: boolean; error?: string } {
  // Manual groups should not have criteria
  if (type === 'manual' && criteria !== null) {
    return {
      valid: false,
      error: 'Grupos manuais não devem ter critérios de associação',
    };
  }

  // Non-manual groups should have criteria
  if (type !== 'manual' && !criteria) {
    return {
      valid: false,
      error: 'Grupos automáticos devem ter critérios de associação',
    };
  }

  // Validate collection groups have collectionId
  if (type === 'colecao' && criteria?.type === 'colecao' && !criteria.collectionId) {
    return {
      valid: false,
      error: 'Grupos de coleção devem especificar um ID de coleção',
    };
  }

  return { valid: true };
}

/**
 * Validates that a group name is unique (excluding deleted groups)
 * Requirements: 1.2
 */
export async function validateGroupNameUnique(
  name: string,
  excludeGroupId?: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    let query = supabase
      .from('chat_groups')
      .select('id')
      .eq('name', name)
      .is('deleted_at', null);

    if (excludeGroupId) {
      query = query.neq('id', excludeGroupId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (which is what we want)
      console.error('Error checking group name uniqueness:', error);
      return {
        valid: false,
        error: 'Erro ao validar nome do grupo',
      };
    }

    if (data) {
      return {
        valid: false,
        error: 'Já existe um grupo com este nome',
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating group name uniqueness:', error);
    return {
      valid: false,
      error: 'Erro ao validar nome do grupo',
    };
  }
}

/**
 * Validates attachment file size and type
 * Requirements: 9.2
 */
export function validateAttachment(file: File): { valid: boolean; error?: string } {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'Arquivo muito grande. Tamanho máximo: 10MB',
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de arquivo não permitido',
    };
  }

  return { valid: true };
}
