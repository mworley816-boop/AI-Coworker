create or replace function claim_run_lease(p_run_id uuid,p_owner text,p_lease_seconds integer default 60)
returns table(id uuid,lease_expires_at timestamptz)
language sql
security invoker
set search_path=public
as $$
  update runs
  set lease_owner=p_owner,
      lease_expires_at=now()+make_interval(secs=>greatest(1,p_lease_seconds))
  where runs.id=p_run_id
    and (runs.lease_expires_at is null or runs.lease_expires_at<=now() or runs.lease_owner=p_owner)
  returning runs.id,runs.lease_expires_at;
$$;
