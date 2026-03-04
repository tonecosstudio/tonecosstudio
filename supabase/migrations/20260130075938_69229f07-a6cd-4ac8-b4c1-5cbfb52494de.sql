-- Suporte a "pular pro final" sem mudar status: adiciona coluna de ordenaÃƒÂ§ÃƒÂ£o
alter table public.images_queue
add column if not exists priority_at timestamptz not null default now();

create index if not exists images_queue_status_priority_at_idx
on public.images_queue (status, priority_at);

-- MantÃƒÂ©m updated_at consistente tambÃƒÂ©m na fila
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_images_queue_updated_at'
  ) then
    create trigger set_images_queue_updated_at
    before update on public.images_queue
    for each row execute function public.set_updated_at();
  end if;
end $$;
