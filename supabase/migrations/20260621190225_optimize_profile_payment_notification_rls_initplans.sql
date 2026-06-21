drop policy if exists profiles_insert_policy on public.profiles;
drop policy if exists profiles_select_policy on public.profiles;
drop policy if exists profiles_update_policy on public.profiles;
drop policy if exists profiles_delete_policy on public.profiles;

create policy profiles_insert_policy
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy profiles_select_policy
on public.profiles
for select
to authenticated
using (
  ((select auth.uid()) = id)
  or ((select current_user_role()) = any (array['admin'::user_role, 'super_admin'::user_role]))
);

create policy profiles_update_policy
on public.profiles
for update
to authenticated
using (
  ((select auth.uid()) = id)
  or ((select current_user_role()) = any (array['admin'::user_role, 'super_admin'::user_role]))
);

create policy profiles_delete_policy
on public.profiles
for delete
to authenticated
using ((select current_user_role()) = 'super_admin'::user_role);

drop policy if exists notification_preferences_select_own_or_admin on public.notification_preferences;
drop policy if exists notification_preferences_modify_own_or_admin on public.notification_preferences;

create policy notification_preferences_select_own_or_admin
on public.notification_preferences
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select has_role((select auth.uid()), 'admin'::text))
);

create policy notification_preferences_modify_own_or_admin
on public.notification_preferences
for all
to authenticated
using (
  user_id = (select auth.uid())
  or (select has_role((select auth.uid()), 'admin'::text))
)
with check (
  user_id = (select auth.uid())
  or (select has_role((select auth.uid()), 'admin'::text))
);

drop policy if exists user_notifications_select_own on public.user_notifications;
drop policy if exists user_notifications_update_own on public.user_notifications;
drop policy if exists user_notifications_delete_own on public.user_notifications;
drop policy if exists user_notifications_insert_admin on public.user_notifications;
drop policy if exists user_notifications_delete_admin on public.user_notifications;

create policy user_notifications_select_own
on public.user_notifications
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy user_notifications_update_own
on public.user_notifications
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy user_notifications_delete_own
on public.user_notifications
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy user_notifications_insert_admin
on public.user_notifications
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['admin'::user_role, 'super_admin'::user_role])
  )
);

create policy user_notifications_delete_admin
on public.user_notifications
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['admin'::user_role, 'super_admin'::user_role])
  )
);

drop policy if exists payment_methods_select_own on public.payment_methods;
drop policy if exists payment_methods_insert_own on public.payment_methods;
drop policy if exists payment_methods_update_own on public.payment_methods;
drop policy if exists payment_methods_delete_own on public.payment_methods;
drop policy if exists payment_methods_select_admin on public.payment_methods;

create policy payment_methods_select_own
on public.payment_methods
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy payment_methods_insert_own
on public.payment_methods
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy payment_methods_update_own
on public.payment_methods
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy payment_methods_delete_own
on public.payment_methods
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy payment_methods_select_admin
on public.payment_methods
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['admin'::user_role, 'super_admin'::user_role])
  )
);

drop policy if exists manual_payments_select_own on public.manual_payments;
drop policy if exists manual_payments_select_admin on public.manual_payments;
drop policy if exists manual_payments_modify_admin on public.manual_payments;

create policy manual_payments_select_own
on public.manual_payments
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy manual_payments_select_admin
on public.manual_payments
for select
to authenticated
using ((select current_user_role()) = any (array['admin'::user_role, 'super_admin'::user_role]));

create policy manual_payments_modify_admin
on public.manual_payments
for all
to authenticated
using ((select current_user_role()) = any (array['admin'::user_role, 'super_admin'::user_role]));

drop policy if exists standalone_purchases_insert_own on public.standalone_purchases;
drop policy if exists standalone_purchases_select_own on public.standalone_purchases;
drop policy if exists standalone_purchases_select_admin on public.standalone_purchases;
drop policy if exists standalone_purchases_modify_admin on public.standalone_purchases;

create policy standalone_purchases_insert_own
on public.standalone_purchases
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy standalone_purchases_select_own
on public.standalone_purchases
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy standalone_purchases_select_admin
on public.standalone_purchases
for select
to authenticated
using ((select current_user_role()) = any (array['admin'::user_role, 'super_admin'::user_role]));

create policy standalone_purchases_modify_admin
on public.standalone_purchases
for all
to authenticated
using ((select current_user_role()) = any (array['admin'::user_role, 'super_admin'::user_role]));
