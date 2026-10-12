-- Run manually in Atlas Supabase SQL Editor. No lasting quota consumption.
-- This checks quota exhaustion in one transaction, not concurrent sessions.
begin;
do $$
begin
 if not public.atlas_reserve_graphic_daily_quota((now() at time zone 'UTC')::date,5,5)
 then raise exception 'Expected first five reservations to succeed'; end if;
 if public.atlas_reserve_graphic_daily_quota((now() at time zone 'UTC')::date,1,5)
 then raise exception 'Quota overflow was incorrectly accepted'; end if;
end $$;
rollback;
