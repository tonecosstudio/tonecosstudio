alter default privileges in schema public
revoke execute on functions from public;

create or replace function public.admin_delete_notification(p_notification_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_result_id uuid;
begin
  delete from public.admin_notifications
  where id = p_notification_id
  returning id into v_result_id;

  if v_result_id is null then
    raise exception 'Notification not found' using errcode = 'P0002';
  end if;

  return v_result_id;
end;
$function$;

do $$
declare
  v_gateway_functions constant text[] := array[
    'create_admin_notification',
    'sync_all_automatic_groups',
    'admin_delete_notification',
    'admin_add_chat_group_member',
    'admin_add_chat_group_members',
    'admin_add_coins_to_user',
    'admin_add_holiday',
    'admin_adjust_subscription_credit_credits',
    'admin_approve_character_choice',
    'admin_approve_manual_payment_with_notification',
    'admin_approve_standalone_payment_voucher',
    'admin_assign_collection_to_tier',
    'admin_assign_collections_to_tier',
    'admin_assign_delivery_to_cycle',
    'admin_assign_production',
    'admin_block_production',
    'admin_bulk_assign_collections_to_tier',
    'admin_bulk_create_photo_metadata',
    'admin_bulk_update_character_price_multipliers',
    'admin_cancel_conversation_reminder',
    'admin_cancel_standalone_purchase',
    'admin_close_subscription_credit_production_cycle',
    'admin_complete_production_stage',
    'admin_create_bonus_piece',
    'admin_create_chat_group',
    'admin_create_collection',
    'admin_create_conversation_reminder',
    'admin_create_photo_metadata',
    'admin_create_subscription_credit_character',
    'admin_create_subscription_credit_production_cycle',
    'admin_deactivate_subscription_credit_character',
    'admin_delete_catalog_character',
    'admin_delete_chat_group_message',
    'admin_delete_collection',
    'admin_delete_collection_character',
    'admin_delete_collection_type',
    'admin_delete_group_message_template',
    'admin_delete_holiday',
    'admin_delete_internal_support_note',
    'admin_delete_payment_file_record',
    'admin_delete_photo_metadata',
    'admin_delete_price_category',
    'admin_delete_pricing_tier',
    'admin_delete_quick_reply',
    'admin_delete_support_attachment_record',
    'admin_delete_support_message',
    'admin_edit_chat_group_message',
    'admin_edit_internal_support_note',
    'admin_extend_character_choice_deadline',
    'admin_get_or_create_delivery_cycle',
    'admin_get_or_create_notification_settings',
    'admin_insert_collection_character',
    'admin_insert_collection_characters',
    'admin_link_bonus_piece_to_delivery',
    'admin_log_stage_transition',
    'admin_mark_standalone_production_complete',
    'admin_mark_subscription_delivery_delivered_from_tracking',
    'admin_process_subscription_payment',
    'admin_publish_catalog_import_item',
    'admin_record_order_status_history',
    'admin_register_chat_group_attachment',
    'admin_register_preorder_manual_payment',
    'admin_reject_character_choice',
    'admin_reject_manual_payment_with_notification',
    'admin_reject_standalone_payment_voucher',
    'admin_release_preorder_final_payment',
    'admin_remove_chat_group_member',
    'admin_reorder_quick_replies',
    'admin_request_manual_payment_info',
    'admin_save_collection_type',
    'admin_save_group_message_template',
    'admin_save_pricing_tier_plan',
    'admin_save_quick_reply',
    'admin_save_subscription_plan_configuration',
    'admin_schedule_group_message',
    'admin_schedule_subscription_deliveries',
    'admin_send_chat_group_message',
    'admin_send_payment_link',
    'admin_set_quick_reply_active',
    'admin_soft_delete_chat_group',
    'admin_transition_delivery_cycle_status',
    'admin_unassign_collection_from_tier',
    'admin_unblock_production',
    'admin_update_bonus_piece_status',
    'admin_update_character_price_multiplier',
    'admin_update_collection',
    'admin_update_collection_base_prices',
    'admin_update_collection_character',
    'admin_update_delivery_status_legacy',
    'admin_update_holiday',
    'admin_update_manual_payment_status',
    'admin_update_notification_settings',
    'admin_update_payment_setting',
    'admin_update_photo_metadata',
    'admin_update_pricing_context_multipliers',
    'admin_update_production_estimated_completion',
    'admin_update_production_notes',
    'admin_update_production_schedule',
    'admin_update_production_setting',
    'admin_update_production_stage',
    'admin_update_production_stage_notes',
    'admin_update_purchase_mode',
    'admin_update_quote_status',
    'admin_update_quote_tracking_code',
    'admin_update_standalone_fulfillment_status',
    'admin_update_standalone_pricing',
    'admin_update_standalone_tracking_code',
    'admin_update_subscription_credit_character',
    'admin_update_subscription_delivery_dates',
    'admin_update_subscription_plan_collection_limit',
    'admin_update_support_conversation',
    'admin_upsert_catalog_character',
    'admin_upsert_price_category',
    'admin_upsert_system_settings'
  ];
  v_target regprocedure;
begin
  for v_target in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(v_gateway_functions)
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      v_target
    );
    execute format(
      'grant execute on function %s to service_role',
      v_target
    );
  end loop;
end;
$$;
