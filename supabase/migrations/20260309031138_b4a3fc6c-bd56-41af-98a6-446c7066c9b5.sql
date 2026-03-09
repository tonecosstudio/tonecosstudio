
-- =====================================================
-- SECURITY HARDENING: RLS Policies
-- =====================================================

-- 1. PROFILES: Remove dangerous public profile policy that exposes CPF, address, phone
-- The app should use the get_public_profile() RPC function for public profiles (already exists)
DROP POLICY IF EXISTS "Authenticated can view public profiles" ON public.profiles;

-- Create a safe public profile view policy that only works via RPC
-- Users can still see their own profile and admins can see all
-- For public profiles, the existing get_public_profile() SECURITY DEFINER function handles it safely

-- 2. ADMIN_PAYMENT_METHODS: Restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view active payment methods" ON public.admin_payment_methods;

CREATE POLICY "Authenticated can view active payment methods"
ON public.admin_payment_methods
FOR SELECT
TO authenticated
USING (is_active = true);

-- 3. MANUAL_PAYMENTS: Add INSERT policy for users (they need to create their own payments)
CREATE POLICY "Users can insert own payments"
ON public.manual_payments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. PAYMENT_FILES: Add INSERT policy for users (they need to upload payment proofs)
CREATE POLICY "Users can upload own payment files"
ON public.payment_files
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM manual_payments mp
    WHERE mp.id = payment_files.payment_id
    AND mp.user_id = auth.uid()
  )
);

-- 5. USER_NOTIFICATIONS: Add admin INSERT policy (system needs to create notifications for users)
CREATE POLICY "Admins can insert user notifications"
ON public.user_notifications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. SUBSCRIPTION_COLLECTIONS: Add DELETE policy for users leaving collections
-- (currently only admin ALL and user INSERT/SELECT)
-- Users should not be able to delete - only admin can, which is already covered by ALL

-- 7. CHAT_GROUP_MEMBERS: Add INSERT policy for users to send messages
-- Members already have INSERT handled via admin ALL policy
-- Add user INSERT for chat_group_messages
CREATE POLICY "Members can send group messages"
ON public.chat_group_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM chat_group_members
    WHERE group_id = chat_group_messages.group_id
    AND user_id = auth.uid()
  )
);

-- 8. SUPPORT_ATTACHMENTS: Add INSERT policy for users to upload attachments
CREATE POLICY "Users can upload attachments in own conversations"
ON public.support_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM support_messages sm
    JOIN support_conversations sc ON sc.id = sm.conversation_id
    WHERE sm.id = support_attachments.message_id
    AND sc.user_id = auth.uid()
  )
);

-- 9. PRICING_TIER_STATS & PRICING_TIERS_WITH_PLANS: These are views
-- Enable RLS on the views (they should inherit from base table policies)
-- Since they are views, we add policies restricting to authenticated users
ALTER VIEW IF EXISTS public.pricing_tier_stats SET (security_invoker = true);
ALTER VIEW IF EXISTS public.pricing_tiers_with_plans SET (security_invoker = true);
