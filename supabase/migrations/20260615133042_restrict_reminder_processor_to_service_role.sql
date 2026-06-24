begin;

revoke execute on function public.process_due_conversation_reminder(uuid) from public, anon, authenticated;
grant execute on function public.process_due_conversation_reminder(uuid) to service_role;

comment on function public.process_due_conversation_reminder(uuid)
  is 'Service-role-only processor for due support conversation reminders.';

commit;
