-- Temporarily retire the public collection feature surface.
-- The feature can be re-enabled later by a dedicated migration that restores
-- grants and a reviewed customer UI.

REVOKE EXECUTE ON FUNCTION public.add_current_user_public_collection_item(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_current_user_public_collection_item(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_current_user_public_collection_notes(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_current_user_public_collection_order(jsonb)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION private_api.add_current_user_public_collection_item(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private_api.remove_current_user_public_collection_item(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private_api.update_current_user_public_collection_notes(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private_api.update_current_user_public_collection_order(jsonb)
  FROM PUBLIC, anon, authenticated;
