
-- OWNERSHIP VALIDATION HARDENING
-- Ensure UPDATE policies have WITH CHECK to prevent user_id reassignment

-- 1. QUOTES: Add WITH CHECK
DROP POLICY IF EXISTS "Users can update own quotes" ON public.quotes;
CREATE POLICY "Users can update own quotes"
ON public.quotes FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2. PROFILES: Add WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. CHARACTER_CHOICES: Add WITH CHECK
DROP POLICY IF EXISTS "Users can update own choices" ON public.character_choices;
CREATE POLICY "Users can update own choices"
ON public.character_choices FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. NOTIFICATIONS: Add WITH CHECK
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5. USER_NOTIFICATIONS: Add WITH CHECK
DROP POLICY IF EXISTS "Users can update own user_notifications" ON public.user_notifications;
CREATE POLICY "Users can update own user_notifications"
ON public.user_notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 6. SUPPORT_MESSAGES: Tighten INSERT to verify conversation ownership
DROP POLICY IF EXISTS "Users can send messages" ON public.support_messages;
CREATE POLICY "Users can send messages"
ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM support_conversations sc
    WHERE sc.id = support_messages.conversation_id
    AND sc.user_id = auth.uid()
  )
);

-- 7. CHAT_GROUP_MEMBERS: Add WITH CHECK on update
DROP POLICY IF EXISTS "Users can update own last_viewed_at" ON public.chat_group_members;
CREATE POLICY "Users can update own last_viewed_at"
ON public.chat_group_members FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
