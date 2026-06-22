grant insert, delete on table public.model_likes to authenticated;

drop policy if exists model_likes_insert_own on public.model_likes;
drop policy if exists model_likes_delete_own on public.model_likes;
drop policy if exists model_likes_select_own_or_admin on public.model_likes;

create policy model_likes_insert_own
on public.model_likes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy model_likes_delete_own
on public.model_likes
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy model_likes_select_own_or_admin
on public.model_likes
for select
to authenticated
using (
  user_id = (select auth.uid())
  or ((select current_user_role()) = any (array['admin'::user_role, 'super_admin'::user_role]))
);

alter function public.like_catalog_model(uuid) security invoker;
alter function public.unlike_catalog_model(uuid) security invoker;
