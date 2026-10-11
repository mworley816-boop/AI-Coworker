-- Atomic daily quota reservations for privileged Atlas server use only.
create table if not exists public.atlas_graphic_daily_quota (
 quota_day date primary key,
 reserved_count integer not null default 0 check (reserved_count >= 0),
 updated_at timestamptz not null default now()
);
alter table public.atlas_graphic_daily_quota enable row level security;
revoke all on public.atlas_graphic_daily_quota from public, anon, authenticated;
create or replace function public.atlas_reserve_graphic_daily_quota(p_day date,p_count integer,p_limit integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare v_reserved integer;
begin
 if p_day is null or p_day <> (now() at time zone 'UTC')::date or p_count is null or p_count < 1 or p_count > 5 or p_limit is null or p_limit < 1 or p_limit > 100 then
  return false;
 end if;
 insert into public.atlas_graphic_daily_quota(quota_day,reserved_count)
 values (p_day,0) on conflict (quota_day) do nothing;
 update public.atlas_graphic_daily_quota
 set reserved_count=reserved_count+p_count,updated_at=now()
 where quota_day=p_day and reserved_count<=p_limit-p_count
 returning reserved_count into v_reserved;
 return found;
end;
$$;
revoke all on function public.atlas_reserve_graphic_daily_quota(date,integer,integer) from public,anon,authenticated;
grant execute on function public.atlas_reserve_graphic_daily_quota(date,integer,integer) to service_role;
-- Reservations deliberately remain consumed after failed attempts: no double-charge risk via retries.
