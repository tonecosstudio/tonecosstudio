begin;

revoke execute on function public.increment_monthly_sales(integer) from public, anon, authenticated;
grant execute on function public.increment_monthly_sales(integer) to service_role;

comment on function public.increment_monthly_sales(integer)
  is 'Internal/service-role production counter used by trusted purchase flows.';

commit;
