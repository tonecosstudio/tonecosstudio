-- =====================================================
-- CHAT GROUPS SYSTEM - RLS Policies for chat_group_messages
-- =====================================================
-- Task: 1.7 Create RLS policies for chat_group_messages
-- Requirements: 18.2, 18.3, 18.4
-- =====================================================

-- Enable RLS on chat_group_messages table
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SELECT Policies
-- =====================================================

-- Members can read group messages (only from groups they belong to)
CREATE POLICY "Members can read group messages"
  ON chat_group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE group_id = chat_group_messages.group_id
      AND user_id = auth.uid()
    )
  );

-- =====================================================
-- INSERT Policies
-- =====================================================

-- Only admins can send messages
CREATE POLICY "Admins can send messages"
  ON chat_group_messages FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- =====================================================
-- UPDATE Policies
-- =====================================================

-- Only admins can update messages
CREATE POLICY "Admins can update messages"
  ON chat_group_messages FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- =====================================================
-- DELETE Policies
-- =====================================================

-- Only admins can delete messages
CREATE POLICY "Admins can delete messages"
  ON chat_group_messages FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );
