-- Coordinate worker claims with reassign_queued_task_atomic.
-- Lock order is always parent task, then run. Do not reverse this order.
create or replace function public.claim_next_queued_run(p_owner text,p_lease_seconds integer default 60)
returns table(id uuid,lease_expires_at timestamptz)
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_task_id uuid;
  v_run_id uuid;
begin
  -- The task lock excludes concurrent reassignment before the run is claimed.
  -- SKIP LOCKED allows another worker to choose a different eligible task.
  select t.id into v_task_id
  from public.tasks t
  where t.status='queued'
    and exists (
      select 1 from public.runs r
      where r.task_id=t.id and r.status='queued'
        and (r.lease_expires_at is null or r.lease_expires_at<=now() or r.lease_owner=p_owner)
    )
  order by t.created_at,t.id
  for update of t skip locked
  limit 1;
  if v_task_id is null then return; end if;

  select r.id into v_run_id
  from public.runs r
  where r.task_id=v_task_id and r.status='queued'
    and (r.lease_expires_at is null or r.lease_expires_at<=now() or r.lease_owner=p_owner)
  order by r.created_at,r.id
  for update of r skip locked
  limit 1;
  if v_run_id is null then return; end if;

  return query
  update public.runs r
  set lease_owner=p_owner,
      lease_expires_at=now()+make_interval(secs=>greatest(1,p_lease_seconds))
  where r.id=v_run_id and r.status='queued'
  returning r.id,r.lease_expires_at;
end;
$$;
revoke execute on function public.claim_next_queued_run(text,integer) from public,anon,authenticated;
grant execute on function public.claim_next_queued_run(text,integer) to service_role;
