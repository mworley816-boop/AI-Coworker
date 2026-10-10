create or replace function recover_expired_run_leases()
returns integer
language plpgsql
security invoker
set search_path=public
as $$
declare recovered integer;
begin
  with recovered_runs as (
    update runs
    set lease_owner=null,lease_expires_at=null
    where lease_expires_at is not null
      and lease_expires_at<=now()
      and status in ('queued','paused','waiting_approval','failed','completed','cancelled')
    returning id
  )
  select count(*) into recovered from recovered_runs;
  return recovered;
end;
$$;
