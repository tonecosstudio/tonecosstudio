-- Migration: Fix collection trigger to handle admin_user_id correctly
-- Purpose: Ensure chat_group creation doesn't fail when creating collections
-- Date: 2026-05-04

-- ============================================
-- PART 1: Drop and recreate function with proper admin handling
-- ============================================

DROP FUNCTION IF EXISTS create_group_for_new_collection() CASCADE;

CREATE OR REPLACE FUNCTION create_group_for_new_collection()
RETURNS TRIGGER AS $$
DECLARE
  group_name TEXT;
  admin_user_id UUID;
BEGIN
  -- Try to get an admin user
  SELECT ur.user_id INTO admin_user_id
  FROM user_roles ur
  WHERE ur.role = 'admin'
  LIMIT 1;
  
  -- If no admin found, use the first user (fallback)
  IF admin_user_id IS NULL THEN
    SELECT id INTO admin_user_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  -- If still no user found, skip group creation
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'No admin or user found to create chat group for collection %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Create group name
  group_name := 'Ã°Å¸â€œÂ¦ ' || NEW.name;
  
  -- Create chat group
  INSERT INTO chat_groups (
    name,
    type,
    membership_criteria,
    created_by,
    created_at,
    updated_at
  )
  VALUES (
    group_name,
    'colecao',
    jsonb_build_object(
      'type', 'colecao',
      'collectionId', NEW.id::text
    ),
    admin_user_id,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail collection creation
    RAISE NOTICE 'Failed to create chat group for collection %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 2: Recreate trigger
-- ============================================

DROP TRIGGER IF EXISTS trigger_create_group_for_collection ON collections;

CREATE TRIGGER trigger_create_group_for_collection
  AFTER INSERT ON collections
  FOR EACH ROW
  EXECUTE FUNCTION create_group_for_new_collection();

-- ============================================
-- PART 3: Add comment
-- ============================================

COMMENT ON FUNCTION create_group_for_new_collection() IS 
  'Creates a chat group automatically when a new collection is created. 
   Handles missing admin gracefully by using fallback user or skipping creation.';
