// Edge Function: auto-sync-groups
// Automatically synchronizes group memberships based on membership criteria
// Runs every 10-15 minutes via pg_cron

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Types
interface Group {
  id: string;
  name: string;
  type: 'manual' | 'assinantes' | 'colecao' | 'lancamentos' | 'pedidos';
  membership_criteria: MembershipCriteria | null;
}

type MembershipCriteria =
  | { type: 'assinantes'; subscriptionStatus: 'active'; collectionId?: string; plan?: string }
  | { type: 'colecao'; collectionId: string }
  | { type: 'lancamentos'; criteria: 'all_users' | 'previous_buyers' }
  | { type: 'pedidos'; status?: string[]; dateFrom?: string; dateTo?: string };

interface SyncResult {
  groupId: string;
  groupName: string;
  added: number;
  removed: number;
  error?: string;
}

/**
 * Evaluates membership criteria for assinantes groups
 * Requirements: 4.1, 4.2, 4.3
 */
async function getSubscriberUsers(
  supabase: any,
  criteria: {
    type: 'assinantes';
    subscriptionStatus: 'active';
    collectionId?: string;
    plan?: string;
  }
): Promise<string[]> {
  let query = supabase
    .from('subscriptions')
    .select('user_id')
    .eq('status', 'active');

  // Optional filter by collection
  if (criteria.collectionId) {
    query = query.eq('collection_id', criteria.collectionId);
  }

  // Optional filter by plan
  if (criteria.plan) {
    query = query.eq('plan', criteria.plan);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching subscribers:', error);
    return [];
  }

  // Return unique user IDs
  return [...new Set(data.map((s: any) => s.user_id))] as string[];
}

/**
 * Evaluates membership criteria for coleção groups
 * Requirements: 5.1, 5.2, 5.3
 */
async function getCollectionSubscribers(
  supabase: any,
  criteria: {
    type: 'colecao';
    collectionId: string;
  }
): Promise<string[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('collection_id', criteria.collectionId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching collection subscribers:', error);
    return [];
  }

  return [...new Set(data.map((s: any) => s.user_id))] as string[];
}

/**
 * Evaluates membership criteria for lançamentos groups
 * Requirements: 6.1, 6.2, 6.3
 */
async function getLaunchUsers(
  supabase: any,
  criteria: {
    type: 'lancamentos';
    criteria: 'all_users' | 'previous_buyers';
  }
): Promise<string[]> {
  if (criteria.criteria === 'all_users') {
    // Get all registered users
    const { data, error } = await supabase
      .from('profiles')
      .select('id');

    if (error) {
      console.error('Error fetching all users:', error);
      return [];
    }

    return data.map((p: any) => p.id);
  } else {
    // Get users with completed orders
    const { data, error } = await supabase
      .from('orders')
      .select('user_id')
      .eq('status', 'completed');

    if (error) {
      console.error('Error fetching previous buyers:', error);
      return [];
    }

      return [...new Set(data.map((o: any) => o.user_id))] as string[];
  }
}

/**
 * Evaluates membership criteria for pedidos groups
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
async function getOrderUsers(
  supabase: any,
  criteria: {
    type: 'pedidos';
    status?: string[];
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<string[]> {
  let query = supabase.from('orders').select('user_id');

  // Filter by status if provided
  if (criteria.status && criteria.status.length > 0) {
    query = query.in('status', criteria.status);
  }

  // Filter by date range if provided
  if (criteria.dateFrom) {
    query = query.gte('created_at', criteria.dateFrom);
  }
  if (criteria.dateTo) {
    query = query.lte('created_at', criteria.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching order users:', error);
    return [];
  }

  return [...new Set(data.map((o: any) => o.user_id))] as string[];
}

/**
 * Gets all users matching the specified membership criteria
 * Requirements: 17.2, 17.3, 17.4
 */
async function getUsersMatchingCriteria(
  supabase: any,
  criteria: MembershipCriteria
): Promise<string[]> {
  if (!criteria) {
    return [];
  }

  switch (criteria.type) {
    case 'assinantes':
      return getSubscriberUsers(supabase, criteria);

    case 'colecao':
      return getCollectionSubscribers(supabase, criteria);

    case 'lancamentos':
      return getLaunchUsers(supabase, criteria);

    case 'pedidos':
      return getOrderUsers(supabase, criteria);

    default:
      return [];
  }
}

/**
 * Syncs membership for a specific group based on its criteria
 * Adds new members and removes members who no longer match
 * IMPORTANT: Removed members lose ALL access including history
 * Requirements: 17.2, 17.3, 17.4, 17.5
 */
async function syncGroupMembership(
  supabase: any,
  group: Group
): Promise<SyncResult> {
  const result: SyncResult = {
    groupId: group.id,
    groupName: group.name,
    added: 0,
    removed: 0,
  };

  try {
    // Skip manual groups
    if (group.type === 'manual') {
      return result;
    }

    // Get current members
    const { data: currentMembers, error: membersError } = await supabase
      .from('chat_group_members')
      .select('user_id')
      .eq('group_id', group.id);

    if (membersError) {
      throw new Error(`Failed to fetch current members: ${membersError.message}`);
    }

    const currentMemberIds = (currentMembers || []).map((m: any) => m.user_id);

    // Get expected members based on criteria
    const expectedMemberIds = await getUsersMatchingCriteria(
      supabase,
      group.membership_criteria as MembershipCriteria
    );

    // Calculate additions and removals
    const toAdd = expectedMemberIds.filter(
      (id) => !currentMemberIds.includes(id)
    );
    const toRemove = currentMemberIds.filter(
      (id: string) => !expectedMemberIds.includes(id)
    );

    // Add new members
    if (toAdd.length > 0) {
      const { error: addError } = await supabase
        .from('chat_group_members')
        .insert(
          toAdd.map((userId) => ({
            group_id: group.id,
            user_id: userId,
          }))
        );

      if (addError) {
        console.error(`Error adding members to group ${group.name}:`, addError);
        result.error = `Failed to add members: ${addError.message}`;
      } else {
        result.added = toAdd.length;
      }
    }

    // Remove invalid members (they lose ALL access including history)
    if (toRemove.length > 0) {
      const { error: removeError } = await supabase
        .from('chat_group_members')
        .delete()
        .eq('group_id', group.id)
        .in('user_id', toRemove);

      if (removeError) {
        console.error(`Error removing members from group ${group.name}:`, removeError);
        result.error = result.error
          ? `${result.error}; Failed to remove members: ${removeError.message}`
          : `Failed to remove members: ${removeError.message}`;
      } else {
        result.removed = toRemove.length;
      }
    }

    console.log(
      `Synced group "${group.name}": +${result.added} members, -${result.removed} members`
    );

    return result;
  } catch (error) {
    console.error(`Error syncing group ${group.name}:`, error);
    result.error = error.message;
    return result;
  }
}

/**
 * Main auto-sync handler
 * Syncs all automatic groups (non-manual, non-deleted)
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */
serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          ...corsHeaders,
          'Access-Control-Allow-Methods': 'POST',
        },
      });
    }

    console.log('Starting auto-sync job...');

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active automatic groups (non-manual, non-deleted)
    const { data: groups, error: groupsError } = await supabase
      .from('chat_groups')
      .select('id, name, type, membership_criteria')
      .is('deleted_at', null)
      .neq('type', 'manual');

    if (groupsError) {
      throw new Error(`Failed to fetch groups: ${groupsError.message}`);
    }

    if (!groups || groups.length === 0) {
      console.log('No automatic groups to sync');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No automatic groups to sync',
          results: [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${groups.length} automatic groups to sync`);

    // Sync each group
    const results: SyncResult[] = [];
    for (const group of groups) {
      const result = await syncGroupMembership(supabase, group as Group);
      results.push(result);
    }

    // Calculate summary
    const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
    const totalRemoved = results.reduce((sum, r) => sum + r.removed, 0);
    const errors = results.filter((r) => r.error);

    console.log(
      `Auto-sync completed: ${totalAdded} members added, ${totalRemoved} members removed, ${errors.length} errors`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Auto-sync completed',
        summary: {
          groupsProcessed: groups.length,
          totalAdded,
          totalRemoved,
          errors: errors.length,
        },
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in auto-sync-groups function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
