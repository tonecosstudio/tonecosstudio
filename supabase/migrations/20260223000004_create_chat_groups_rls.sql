-- =====================================================
-- CHAT GROUPS SYSTEM - RLS Policies for chat_groups
-- =====================================================
-- Task: 1.5 Create RLS policies for chat_groups
-- Requirements: 18.1, 18.4
-- =====================================================

-- Enable RLS on chat_groups table
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SELECT Policies
-- =====================================================

-- Admins can view all groups (including deleted)
CREATE POLICY "Admins can view all groups"
  ON chat_groups FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Members can view their groups (excluding deleted)
CREATE POLICY "Members can view their groups"
  ON chat_groups FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE group_id = chat_groups.id
      AND user_id = auth.uid()
    )
  );

-- =====================================================
-- INSERT Policies
-- =====================================================

-- Only admins can create groups
CREATE POLICY "Admins can create groups"
  ON chat_groups FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- =====================================================
-- UPDATE Policies
-- =====================================================

-- Only admins can update groups
CREATE POLICY "Admins can update groups"
  ON chat_groups FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- =====================================================
-- DELETE Policies
-- =====================================================

-- Only admins can delete groups (soft delete)
CREATE POLICY "Admins can delete groups"
  ON chat_groups FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );
