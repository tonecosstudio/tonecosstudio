-- =====================================================
-- Migration: Grant Permissions Refresh
-- Description: Re-grant permissions to force schema cache reload
-- =====================================================

-- Grant execute permissions on all functions to authenticated users
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile_stats(UUID, INTEGER, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_profile_completion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_production_limit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_settings() TO authenticated;

-- Grant to anon role as well for public functions
GRANT EXECUTE ON FUNCTION public.get_current_production_limit() TO anon;
GRANT EXECUTE ON FUNCTION public.get_system_settings() TO anon;

-- Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';
