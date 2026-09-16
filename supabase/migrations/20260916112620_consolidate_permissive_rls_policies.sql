-- Consolidate equivalent permissive policies while preserving current effective grants.

-- admin_payment_methods: authenticated can read active rows; admins can read all.
DROP POLICY IF EXISTS "Admins can view all payment methods" ON public.admin_payment_methods;
DROP POLICY IF EXISTS "Authenticated users can view active payment methods" ON public.admin_payment_methods;
CREATE POLICY admin_payment_methods_select_active_or_admin
ON public.admin_payment_methods FOR SELECT TO authenticated
USING (
  is_active = true
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

-- character_choices: browser DML is no longer granted; customer/admin writes use RPCs.
DROP POLICY IF EXISTS "Admins can manage all choices" ON public.character_choices;
DROP POLICY IF EXISTS "Users can create own choices" ON public.character_choices;
DROP POLICY IF EXISTS "Users can update own pending choices" ON public.character_choices;
DROP POLICY IF EXISTS "Admins can view all choices" ON public.character_choices;
DROP POLICY IF EXISTS "Users can view own choices" ON public.character_choices;
CREATE POLICY character_choices_select_own_or_admin
ON public.character_choices FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

-- coin_transactions: direct insert is not granted; reads are owner-or-admin.
DROP POLICY IF EXISTS "System can insert transactions" ON public.coin_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.coin_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.coin_transactions;
CREATE POLICY coin_transactions_select_own_or_admin
ON public.coin_transactions FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

-- collection_characters: preserve direct admin DML grants, but keep SELECT separate.
DROP POLICY IF EXISTS "Admins can manage collection characters" ON public.collection_characters;
CREATE POLICY collection_characters_insert_admin
ON public.collection_characters FOR INSERT TO authenticated
WITH CHECK ((SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]));
CREATE POLICY collection_characters_update_admin
ON public.collection_characters FOR UPDATE TO authenticated
USING ((SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))
WITH CHECK ((SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]));
CREATE POLICY collection_characters_delete_admin
ON public.collection_characters FOR DELETE TO authenticated
USING ((SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]));
DROP POLICY IF EXISTS "Anyone can view catalog items" ON public.collection_characters;
DROP POLICY IF EXISTS "Anyone can view public collection entries" ON public.collection_characters;
CREATE POLICY collection_characters_select_public
ON public.collection_characters FOR SELECT TO public
USING (
  is_catalog = true
  OR (
    status <> 'archived'::text
    AND EXISTS (
      SELECT 1
      FROM public.collections c
      WHERE c.id = collection_characters.collection_id
        AND c.is_active = true
        AND c.status = 'active'::collection_status
    )
  )
);

-- images_queue: preserve current admin DML grants without letting FOR ALL duplicate SELECT.
DROP POLICY IF EXISTS images_queue_modify_admin ON public.images_queue;
CREATE POLICY images_queue_insert_admin
ON public.images_queue FOR INSERT TO authenticated
WITH CHECK ((SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]));
CREATE POLICY images_queue_update_admin
ON public.images_queue FOR UPDATE TO authenticated
USING ((SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))
WITH CHECK ((SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]));
CREATE POLICY images_queue_delete_admin
ON public.images_queue FOR DELETE TO authenticated
USING ((SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]));

-- Read-only commercial tables: combine owner/admin branches.
DROP POLICY IF EXISTS manual_payments_select_admin ON public.manual_payments;
DROP POLICY IF EXISTS manual_payments_select_own ON public.manual_payments;
CREATE POLICY manual_payments_select_own_or_admin
ON public.manual_payments FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

-- models: preserve current admin DML grants; separate anon and authenticated catalog reads.
DROP POLICY IF EXISTS models_modify_admin ON public.models;
CREATE POLICY models_insert_admin
ON public.models FOR INSERT TO authenticated
WITH CHECK ((SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]));
CREATE POLICY models_update_admin
ON public.models FOR UPDATE TO authenticated
USING ((SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))
WITH CHECK ((SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]));
CREATE POLICY models_delete_admin
ON public.models FOR DELETE TO authenticated
USING ((SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]));
DROP POLICY IF EXISTS models_select_admin ON public.models;
DROP POLICY IF EXISTS models_select_authenticated_admin ON public.models;
DROP POLICY IF EXISTS models_select_public_catalog ON public.models;
CREATE POLICY models_select_public_catalog_anon
ON public.models FOR SELECT TO anon
USING (
  is_active = true
  AND catalog_visibility = ANY (ARRAY['general'::text, 'both'::text])
  AND image_path LIKE 'catalog-webp-final/display/%'
  AND (duplicate_of_model_id IS NULL OR duplicate_status = 'unique'::text)
);
CREATE POLICY models_select_public_or_admin_authenticated
ON public.models FOR SELECT TO authenticated
USING (
  (
    is_active = true
    AND catalog_visibility = ANY (ARRAY['general'::text, 'both'::text])
    AND image_path LIKE 'catalog-webp-final/display/%'
    AND (duplicate_of_model_id IS NULL OR duplicate_status = 'unique'::text)
  )
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

-- notification_preferences: keep current direct INSERT/UPDATE grants; SELECT has its own policy.
DROP POLICY IF EXISTS notification_preferences_modify_own_or_admin ON public.notification_preferences;
CREATE POLICY notification_preferences_insert_own_or_admin
ON public.notification_preferences FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR (SELECT has_role((SELECT auth.uid()), 'admin'::text))
);
CREATE POLICY notification_preferences_update_own_or_admin
ON public.notification_preferences FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (SELECT has_role((SELECT auth.uid()), 'admin'::text))
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR (SELECT has_role((SELECT auth.uid()), 'admin'::text))
);

-- payment_files: collapse owner/admin read paths.
DROP POLICY IF EXISTS payment_files_select_admin ON public.payment_files;
DROP POLICY IF EXISTS payment_files_select_own ON public.payment_files;
CREATE POLICY payment_files_select_own_or_admin
ON public.payment_files FOR SELECT TO authenticated
USING (
  (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
  OR uploaded_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.manual_payments mp
    WHERE mp.id = payment_files.payment_id
      AND mp.user_id = (SELECT auth.uid())
  )
);

-- payment_methods: direct browser DML is no longer granted.
DROP POLICY IF EXISTS payment_methods_insert_own ON public.payment_methods;
DROP POLICY IF EXISTS payment_methods_update_own ON public.payment_methods;
DROP POLICY IF EXISTS payment_methods_delete_own ON public.payment_methods;
DROP POLICY IF EXISTS payment_methods_select_admin ON public.payment_methods;
DROP POLICY IF EXISTS payment_methods_select_own ON public.payment_methods;
CREATE POLICY payment_methods_select_own_or_admin
ON public.payment_methods FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
  )
);

-- production_queue: owner-or-admin read.
DROP POLICY IF EXISTS "Admins can view all production items" ON public.production_queue;
DROP POLICY IF EXISTS "Users can view own production items" ON public.production_queue;
CREATE POLICY production_queue_select_own_or_admin
ON public.production_queue FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

-- quick_replies: active for authenticated users, all rows for admins.
DROP POLICY IF EXISTS quick_replies_select_active ON public.quick_replies;
DROP POLICY IF EXISTS quick_replies_select_admin ON public.quick_replies;
CREATE POLICY quick_replies_select_active_or_admin
ON public.quick_replies FOR SELECT TO authenticated
USING (
  is_active = true
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
  )
);

DROP POLICY IF EXISTS quotes_select_admin ON public.quotes;
DROP POLICY IF EXISTS quotes_select_own ON public.quotes;
CREATE POLICY quotes_select_own_or_admin
ON public.quotes FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

DROP POLICY IF EXISTS standalone_purchases_select_admin ON public.standalone_purchases;
DROP POLICY IF EXISTS standalone_purchases_select_own ON public.standalone_purchases;
CREATE POLICY standalone_purchases_select_own_or_admin
ON public.standalone_purchases FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

DROP POLICY IF EXISTS subscription_deliveries_select_admin ON public.subscription_deliveries;
DROP POLICY IF EXISTS subscription_deliveries_select_own ON public.subscription_deliveries;
CREATE POLICY subscription_deliveries_select_own_or_admin
ON public.subscription_deliveries FOR SELECT TO authenticated
USING (
  (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
  OR EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.id = subscription_deliveries.subscription_id
      AND s.user_id = (SELECT auth.uid())
  )
);

-- subscription_payments currently has no direct authenticated table grant; retain one latent read rule only.
DROP POLICY IF EXISTS subscription_payments_modify_admin ON public.subscription_payments;
DROP POLICY IF EXISTS subscription_payments_select_admin ON public.subscription_payments;
DROP POLICY IF EXISTS subscription_payments_select_own ON public.subscription_payments;
CREATE POLICY subscription_payments_select_own_or_admin
ON public.subscription_payments FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

DROP POLICY IF EXISTS subscriptions_select_admin ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
CREATE POLICY subscriptions_select_own_or_admin
ON public.subscriptions FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

-- support_conversations: browser INSERT is no longer granted; writes use RPCs.
DROP POLICY IF EXISTS support_conversations_insert_own ON public.support_conversations;
DROP POLICY IF EXISTS support_conversations_select_admin ON public.support_conversations;
DROP POLICY IF EXISTS support_conversations_select_own ON public.support_conversations;
CREATE POLICY support_conversations_select_own_or_admin
ON public.support_conversations FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

DROP POLICY IF EXISTS "Admins can view all coins" ON public.user_coins;
DROP POLICY IF EXISTS "Users can view own coins" ON public.user_coins;
CREATE POLICY user_coins_select_own_or_admin
ON public.user_coins FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR (SELECT current_user_role()) = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
);

-- user_notifications: direct DELETE/UPDATE grants are closed; keep read policy only.
DROP POLICY IF EXISTS user_notifications_delete_admin ON public.user_notifications;
DROP POLICY IF EXISTS user_notifications_delete_own ON public.user_notifications;
DROP POLICY IF EXISTS user_notifications_update_own ON public.user_notifications;

-- wishlist: direct browser DML is closed; keep owner/admin reads.
DROP POLICY IF EXISTS wishlist_insert_own ON public.wishlist;
DROP POLICY IF EXISTS wishlist_update_own ON public.wishlist;
DROP POLICY IF EXISTS wishlist_delete_own ON public.wishlist;
DROP POLICY IF EXISTS wishlist_select_admin ON public.wishlist;
DROP POLICY IF EXISTS wishlist_select_own ON public.wishlist;
CREATE POLICY wishlist_select_own_or_admin
ON public.wishlist FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
  )
);
