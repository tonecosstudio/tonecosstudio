-- Restrict direct Data API reads to presentation settings only.
-- The former allowlist exposed payment destinations (PIX keys/payment links)
-- even when commerce gates were closed. No payment values are modified here.
-- The existing administrator policy remains the sole reader of payment settings.
ALTER POLICY tonart_system_settings_public_allowlist ON public.system_settings
  USING (key = ANY (ARRAY[
    'company_name', 'company_address', 'company_logo_url', 'cnpj', 'legal_name',
    'contact_email', 'support_email', 'privacy_email', 'dpo_email', 'phone_primary',
    'phone_whatsapp', 'business_hours', 'website_url', 'facebook_url', 'instagram_url',
    'twitter_url', 'youtube_url', 'default_price_full', 'default_price_pix',
    'default_deposit_amount', 'pix_discount_percentage', 'max_installments_no_interest',
    'max_installments_with_interest', 'production_days_min', 'production_days_max',
    'shipping_business_days', 'sales_duration_days', 'delivery_interval_days',
    'character_choice_days', 'balance_payment_days', 'exchange_deadline_days',
    'days_to_next_delivery', 'user_online_threshold_minutes',
    'notification_polling_interval_ms', 'toast_duration_ms', 'default_page_size',
    'search_debounce_ms', 'input_debounce_ms', 'image_compression_quality',
    'max_image_size_mb', 'hero_image_url'
  ]::text[]));
