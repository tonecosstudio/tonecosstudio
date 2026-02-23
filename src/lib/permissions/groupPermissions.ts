// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

/**
 * Permission validation utilities for chat groups system
 * Requirements: 18.1, 18.2, 18.3, 18.4
 */

/**
 * Checks if the current user is an admin
 * Requirements: 18.1, 18.2
 */
export async function isAdmin(userId?: string): Promise<boolean> {
  try {
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    
    if (!uid) {
      return false;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', uid)
      .single();

    if (error || !profile) {
      return false;
    }

    return profile.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Checks if a user is a member of a specific group
 * Requirements: 18.3
 */
export async function isGroupMember(
  groupId: string,
  userId?: string
): Promise<boolean> {
  try {
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    
    if (!uid) {
      return false;
    }

    const { data, error } = await supabase
      .from('chat_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', uid)
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking group membership:', error);
    return false;
  }
}

/**
 * Checks if a user can manage a group (admin only)
 * Requirements: 18.2, 18.4
 */
export async function canManageGroup(
  groupId: string,
  userId?: string
): Promise<boolean> {
  try {
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    
    if (!uid) {
      return false;
    }

    // Only admins can manage groups
    return await isAdmin(uid);
  } catch (error) {
    console.error('Error checking group management permission:', error);
    return false;
  }
}

/**
 * Checks if a user can send messages to a group (admin only)
 * Requirements: 18.2
 */
export async function canSendGroupMessage(
  groupId: string,
  userId?: string
): Promise<boolean> {
  try {
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    
    if (!uid) {
      return false;
    }

    // Only admins can send broadcast messages
    return await isAdmin(uid);
  } catch (error) {
    console.error('Error checking message send permission:', error);
    return false;
  }
}

/**
 * Checks if a user can view messages in a group (member or admin)
 * Requirements: 18.3
 */
export async function canViewGroupMessages(
  groupId: string,
  userId?: string
): Promise<boolean> {
  try {
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    
    if (!uid) {
      return false;
    }

    // Admins can view all groups, members can view their groups
    const admin = await isAdmin(uid);
    if (admin) {
      return true;
    }

    return await isGroupMember(groupId, uid);
  } catch (error) {
    console.error('Error checking message view permission:', error);
    return false;
  }
}

/**
 * Checks if a user can delete a group (admin only)
 * Requirements: 18.4
 */
export async function canDeleteGroup(
  groupId: string,
  userId?: string
): Promise<boolean> {
  try {
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    
    if (!uid) {
      return false;
    }

    // Only admins can delete groups
    return await isAdmin(uid);
  } catch (error) {
    console.error('Error checking group delete permission:', error);
    return false;
  }
}

/**
 * Throws an error if the user is not an admin
 * Requirements: 18.1, 18.2, 18.4
 */
export async function requireAdmin(userId?: string): Promise<void> {
  const admin = await isAdmin(userId);
  if (!admin) {
    throw new Error('Acesso negado: apenas administradores podem realizar esta ação');
  }
}

/**
 * Throws an error if the user is not a member of the group
 * Requirements: 18.3
 */
export async function requireGroupMember(
  groupId: string,
  userId?: string
): Promise<void> {
  const member = await isGroupMember(groupId, userId);
  if (!member) {
    throw new Error('Acesso negado: você não é membro deste grupo');
  }
}

/**
 * Throws an error if the user cannot manage the group
 * Requirements: 18.2, 18.4
 */
export async function requireGroupManagement(
  groupId: string,
  userId?: string
): Promise<void> {
  const canManage = await canManageGroup(groupId, userId);
  if (!canManage) {
    throw new Error('Acesso negado: você não tem permissão para gerenciar este grupo');
  }
}
