begin;

revoke execute on function public.activate_delivery_with_auto_maintenance(uuid) from public, anon, authenticated;
grant execute on function public.activate_delivery_with_auto_maintenance(uuid) to service_role;

revoke execute on function public.apply_automatic_delivery_maintenance(uuid, uuid) from public, anon, authenticated;
grant execute on function public.apply_automatic_delivery_maintenance(uuid, uuid) to service_role;

comment on function public.activate_delivery_with_auto_maintenance(uuid)
  is 'Service-role-only scheduled delivery activation used by cron-create-deliveries.';

comment on function public.apply_automatic_delivery_maintenance(uuid, uuid)
  is 'Service-role-only automatic delivery maintenance used by trusted backend flows.';

commit;
