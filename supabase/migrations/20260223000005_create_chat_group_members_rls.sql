-- =====================================================
-- CHAT GROUPS SYSTEM - RLS Policies for chat_group_members
-- =====================================================
-- Task: 1.6 Create RLS policies for chat_group_members
-- Requirements: 18.1, 18.3, 18.4
-- =====================================================

-- Enable RLS on chat_group_members table
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SELECT Policies
-- =====================================================

-- Members can view their own membership
CREATE POLICY "Members can view their own membership"
  ON chat_group_members FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Admins can view all memberships
CREATE POLICY "Admins can view all memberships"
  ON chat_group_members FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- =====================================================
-- ALL Operations Policy (INSERT, UPDATE, DELETE)
-- =====================================================

-- Only admins can manage memberships (insert, update, delete)
CREATE POLICY "Admins can manage memberships"
  ON chat_group_members FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );
