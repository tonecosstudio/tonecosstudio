begin;

drop function if exists public.mark_notification_as_read(uuid);
drop function if exists public.mark_all_notifications_as_read();
drop view if exists public.notifications;

commit;
