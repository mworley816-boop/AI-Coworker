create or replace function claim_next_queued_run(p_owner text,p_lease_seconds integer default 60)
returns table(id uuid,lease_expires_at timestamptz)
language plpgsql
security invoker
set search_path=public
as $$
begin
  return query
  with candidate as (
    select r.id
    from runs r
    where r.status='queued'
      and (r.lease_expires_at is null or r.lease_expires_at<=now() or r.lease_owner=p_owner)
    order by r.created_at asc
    for update skip locked
    limit 1
  )
  update runs r
  set lease_owner=p_owner,
      lease_expires_at=now()+make_interval(secs=>greatest(1,p_lease_seconds))
  from candidate c
  where r.id=c.id
  returning r.id,r.lease_expires_at;
end;
$$;
