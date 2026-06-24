begin;

revoke execute on function public.sync_automatic_group_members(uuid) from public, anon, authenticated;
grant execute on function public.sync_automatic_group_members(uuid) to service_role;

comment on function public.sync_automatic_group_members(uuid)
  is 'Internal/service-role helper used by sync_all_automatic_groups.';

commit;
