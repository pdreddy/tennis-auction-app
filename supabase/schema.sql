create table if not exists public.app_kv (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_kv_set_updated_at on public.app_kv;
create trigger app_kv_set_updated_at
before update on public.app_kv
for each row
execute function public.set_updated_at();
