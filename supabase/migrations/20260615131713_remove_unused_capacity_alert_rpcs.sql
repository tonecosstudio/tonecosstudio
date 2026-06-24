begin;

drop function if exists public.configure_capacity_alert(uuid, integer, text, text);
drop function if exists public.check_capacity_alert(uuid);
drop function if exists public.reset_capacity_alert(uuid);

commit;
