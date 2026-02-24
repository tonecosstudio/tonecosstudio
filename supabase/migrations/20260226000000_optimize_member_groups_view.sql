-- Migration: Optimize member groups query with materialized view
-- Feature: chat-groups-system
-- Purpose: Reduce N+1 queries in getMemberGroups from 30+ to 1-2 queries

-- Create a function to get member groups with all data in a single query
CREATE OR REPLACE FUNCTION get_member_groups_optimized(p_user_id UUID)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  group_type TEXT,
  last_viewed_at TIMESTAMPTZ,
  unread_count BIGINT,
  last_message_text TEXT,
  last_message_sender_name TEXT,
  last_message_created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_memberships AS (
    -- Get all groups the user is a member of
    SELECT 
      cgm.group_id,
      cgm.last_viewed_at
    FROM chat_group_members cgm
    WHERE cgm.user_id = p_user_id
  ),
  group_info AS (
    -- Get group details
    SELECT 
      cg.id,
      cg.name,
      cg.type
    FROM chat_groups cg
    INNER JOIN user_memberships um ON um.group_id = cg.id
    WHERE cg.deleted_at IS NULL
  ),
  last_messages AS (
    -- Get last message for each group (optimized with DISTINCT ON)
    SELECT DISTINCT ON (cgm.group_id)
      cgm.group_id,
      cgm.message,
      cgm.sender_id,
      cgm.created_at,
      p.full_name,
      p.email
    FROM chat_group_messages cgm
    INNER JOIN user_memberships um ON um.group_id = cgm.group_id
    LEFT JOIN profiles p ON p.id = cgm.sender_id
    ORDER BY cgm.group_id, cgm.created_at DESC
  ),
  unread_counts AS (
    -- Calculate unread messages for each group
    SELECT 
      cgm.group_id,
      COUNT(*) as unread_count
    FROM chat_group_messages cgm
    INNER JOIN user_memberships um ON um.group_id = cgm.group_id
    WHERE 
      -- Messages after last viewed (or all if never viewed)
      (um.last_viewed_at IS NULL OR cgm.created_at > um.last_viewed_at)
    GROUP BY cgm.group_id
  )
  -- Combine all data
  SELECT 
    gi.id as group_id,
    gi.name as group_name,
    gi.type as group_type,
    um.last_viewed_at,
    COALESCE(uc.unread_count, 0) as unread_count,
    lm.message as last_message_text,
    COALESCE(lm.full_name, lm.email, 'Usuário') as last_message_sender_name,
    lm.created_at as last_message_created_at
  FROM group_info gi
  INNER JOIN user_memberships um ON um.group_id = gi.id
  LEFT JOIN last_messages lm ON lm.group_id = gi.id
  LEFT JOIN unread_counts uc ON uc.group_id = gi.id
  ORDER BY lm.created_at DESC NULLS LAST;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_member_groups_optimized IS 'Optimized function to get all groups for a member with unread counts and last messages in a single query';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_member_groups_optimized TO authenticated;

-- Create index to optimize the function
CREATE INDEX IF NOT EXISTS idx_chat_group_messages_group_created 
ON chat_group_messages(group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_group_members_user_group 
ON chat_group_members(user_id, group_id);
