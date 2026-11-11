-- Consolidate preferences into EXISTING authenticated quotes SSOT.
alter table public.quotes
  add column if not exists customer_whatsapp text
    check (customer_whatsapp is null or customer_whatsapp ~ '^[0-9]{10,13}$'),
  add column if not exists postal_code text
    check (postal_code is null or postal_code ~ '^[0-9]{8}$'),
  add column if not exists desired_scale text not null default 'a definir'
    check (desired_scale in ('a definir','1/10','1/6','outro')),
  add column if not exists finishing text not null default 'a definir'
    check (finishing in ('a definir','pintado','sem pintura'));

-- No overloaded routines; replace original with the expanded signature.
drop function if exists public.submit_catalog_quote_request(jsonb,text);
drop function if exists private_api.submit_catalog_quote_request(jsonb,text);

create or replace function private_api.submit_catalog_quote_request(
  p_models jsonb, p_notes text default null,
  p_whatsapp text default null,
  p_postal_code text default null,
  p_scale text default 'a definir',
  p_finishing text default 'a definir'
)
returns uuid
language plpgsql security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := (select auth.uid());
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_whatsapp text := nullif(regexp_replace(coalesce(p_whatsapp,''), '[ ()+.-]', '', 'g'),'');
  v_postal text := nullif(regexp_replace(coalesce(p_postal_code,''), '[^0-9]', '', 'g'),'');
  v_entry jsonb;
  v_slug text;
  v_quantity text;
  v_models jsonb := '[]'::jsonb;
  v_seen text[] := array[]::text[];
  v_quote_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where id=v_user_id) then
    raise exception 'Customer account not initialized' using errcode = '23503';
  end if;
  if p_models is null or jsonb_typeof(p_models) <> 'array'
     or jsonb_array_length(p_models) not between 1 and 50 then
    raise exception 'Select between 1 and 50 models' using errcode='22023';
  end if;
  if length(coalesce(v_notes,'')) > 2000 then
    raise exception 'Quote notes exceed 2000 characters' using errcode='22023';
  end if;
  if length(coalesce(p_whatsapp,'')) > 40
     or (v_whatsapp is not null and v_whatsapp !~ '^[0-9]{10,13}$')
     or (v_postal is not null and v_postal !~ '^[0-9]{8}$')
     or p_scale not in ('a definir', '1/10', '1/6', 'outro')
     or p_finishing not in ('a definir', 'pintado', 'sem pintura')
     or p_scale is null or p_finishing is null then
    raise exception 'Quote contact or preferences invalid' using errcode='22023';
  end if;
  for v_entry in select value from jsonb_array_elements(p_models) loop
    if jsonb_typeof(v_entry) <> 'object'
       or (v_entry - 'slug' - 'quantity') <> '{}'::jsonb
       or jsonb_typeof(v_entry->'slug') <> 'string'
       or jsonb_typeof(v_entry->'quantity') <> 'number' then
      raise exception 'Invalid quote item' using errcode='22023';
    end if;
    v_slug := v_entry->>'slug';
    v_quantity := v_entry->>'quantity';
    if v_slug !~ '^[a-z0-9][a-z0-9-]{0,239}$'
       or v_quantity !~ '^(?:[1-9]|10)$'
       or v_slug = any(v_seen) then
      raise exception 'Invalid or duplicate model' using errcode='22023';
    end if;
    v_seen := array_append(v_seen, v_slug);
    v_models := v_models || jsonb_build_array(
      jsonb_build_object('slug',v_slug,'quantity',v_quantity::integer)
    );
  end loop;
  -- Serializes accidental concurrent submissions for this account.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 77231));
  if exists (
    select 1 from public.quotes
    where user_id = v_user_id
      and created_at > clock_timestamp() - interval '60 seconds'
  ) then
    raise exception 'Wait before submitting another quote'
      using errcode='P0001';
  end if;
  insert into public.quotes (user_id, notes, requested_catalog_models,
    customer_whatsapp, postal_code, desired_scale, finishing)
  values (v_user_id, v_notes, v_models,
    v_whatsapp, v_postal, p_scale, p_finishing)
  returning id into v_quote_id;
  return v_quote_id;
end;
$fn$;

create or replace function public.submit_catalog_quote_request(
  p_models jsonb, p_notes text default null,
  p_whatsapp text default null,
  p_postal_code text default null,
  p_scale text default 'a definir',
  p_finishing text default 'a definir'
)
returns uuid language sql security invoker set search_path=''
as $fn$ select private_api.submit_catalog_quote_request(p_models,p_notes,
  p_whatsapp,p_postal_code,p_scale,p_finishing); $fn$;
revoke all on function public.submit_catalog_quote_request(jsonb,text,text,text,text,text)
  from public, anon;
grant execute on function public.submit_catalog_quote_request(jsonb,text,text,text,text,text)
  to authenticated, service_role;
revoke all on function private_api.submit_catalog_quote_request(jsonb,text,text,text,text,text)
  from public, anon;
grant execute on function private_api.submit_catalog_quote_request(jsonb,text,text,text,text,text)
  to authenticated, service_role;


notify pgrst, 'reload schema';
