-- Security Advisor 0028: remove anonymous RPC access from privileged mutations and internal helpers.
-- Public read-only RPCs used by unauthenticated pages are intentionally left unchanged.

REVOKE ALL ON FUNCTION public.activate_subscription_credit_for_current_user(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_subscription_credit_for_current_user(text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_adjust_subscription_credit_credits(text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_subscription_credit_credits(text, integer, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_close_subscription_credit_production_cycle(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_close_subscription_credit_production_cycle(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_create_subscription_credit_character(text, text, numeric, integer, boolean, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_subscription_credit_character(text, text, numeric, integer, boolean, boolean, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_create_subscription_credit_production_cycle(text, integer, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_subscription_credit_production_cycle(text, integer, timestamptz) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_deactivate_subscription_credit_character(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_subscription_credit_character(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_update_subscription_credit_character(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_subscription_credit_character(text, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.cancel_subscription_credit_with_refund(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_subscription_credit_with_refund(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_subscription_credit_individual_order(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_subscription_credit_individual_order(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.initialize_current_user_coin_balance(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.initialize_current_user_coin_balance(integer, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.reactivate_subscription_credit_renewal(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reactivate_subscription_credit_renewal(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.refund_coin_purchase_for_current_user(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_coin_purchase_for_current_user(text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.schedule_subscription_credit_plan_change(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.schedule_subscription_credit_plan_change(text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_subscription_credit_no_renewal(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_subscription_credit_no_renewal(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_subscription_credit_automatic_order(text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_subscription_credit_automatic_order(text, text[]) TO authenticated, service_role;

-- Internal trigger/helper functions should not be exposed as browser-callable RPCs.
REVOKE ALL ON FUNCTION public.create_default_notification_settings() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_user_coins() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_single_default_payment_method() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_wishlist_availability() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_conversation_last_message() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_default_notification_settings() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_user_coins() TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_single_default_payment_method() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_wishlist_availability() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_conversation_last_message() TO service_role;

NOTIFY pgrst, 'reload schema';
