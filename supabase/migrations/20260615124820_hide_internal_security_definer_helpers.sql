BEGIN;

-- Internal helpers are invoked by trusted SECURITY DEFINER entry points. They
-- are implementation details, not independent Data API endpoints.
REVOKE EXECUTE
  ON FUNCTION public.admin_validate_public_image_url_array(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.admin_validate_public_image_url_array(jsonb)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.assert_admin_access()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_admin_access()
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.assert_admin_catalog_access()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_admin_catalog_access()
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.generate_payment_reference()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_payment_reference()
  TO service_role;

REVOKE EXECUTE
  ON FUNCTION public.log_standalone_admin_action(
    uuid, uuid, text, text, text, text, jsonb
  )
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.log_standalone_admin_action(
    uuid, uuid, text, text, text, text, jsonb
  )
  TO service_role;

REVOKE EXECUTE
  ON FUNCTION public.ordax_add_business_days(timestamptz, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE
  ON FUNCTION public.ordax_add_business_days(timestamptz, integer)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.ordax_is_business_day(date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ordax_is_business_day(date)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.ordax_is_holiday(date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ordax_is_holiday(date)
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
