begin;

alter function public.check_capacity_available(uuid, integer)
  security invoker;

alter function public.is_before_cutoff(timestamp with time zone)
  security invoker;

alter function public.should_send_notification(uuid, text)
  security invoker;

create or replace function public.get_stage_photos_with_metadata(p_stage_id uuid)
returns table(
  photo_url text,
  customer_visible boolean,
  caption text,
  uploaded_by_name text,
  uploaded_at timestamp with time zone
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_is_admin boolean := coalesce(
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'super_admin'),
    false
  );
begin
  if p_stage_id is null then
    raise exception 'Production stage is required' using errcode = '22023';
  end if;

  return query
  select
    ppm.photo_url,
    ppm.customer_visible,
    ppm.caption,
    ppm.uploaded_by_name,
    ppm.uploaded_at
  from public.production_photo_metadata ppm
  join public.production_stages ps
    on ps.id = ppm.production_stage_id
  join public.production_queue pq
    on pq.id = ps.production_queue_id
  where ppm.production_stage_id = p_stage_id
    and (
      v_is_admin
      or (ppm.customer_visible = true and pq.user_id = auth.uid())
    )
  order by ppm.uploaded_at asc;
end;
$function$;

comment on function public.check_capacity_available(uuid, integer)
  is 'Checks cycle capacity using the caller permissions and cycles RLS.';

comment on function public.is_before_cutoff(timestamp with time zone)
  is 'Checks the monthly cutoff without elevated database privileges.';

comment on function public.should_send_notification(uuid, text)
  is 'Reads notification preferences using the caller permissions and profiles RLS.';

comment on function public.get_stage_photos_with_metadata(uuid)
  is 'Returns stage photos visible to the current customer or an admin, enforced by RLS.';

commit;
