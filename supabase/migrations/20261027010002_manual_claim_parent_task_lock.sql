-- Serialize manual run claims with task reassignment using the same lock order:
-- parent task first, then child run. Keep the existing lease eligibility rule.
create or replace function public.claim_run_lease(p_run_id uuid,p_owner text,p_lease_seconds integer default 60)
returns table(id uuid,lease_expires_at timestamptz)
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_task_id uuid;
begin
  -- Read the parent ID first; do not acquire a run row lock before the task lock.
  select r.task_id into v_task_id from public.runs r where r.id=p_run_id;
  if v_task_id is null then return; end if;

  perform 1 from public.tasks t where t.id=v_task_id for update of t;
  if not found then return; end if;

  return query
  update public.runs r
  set lease_owner=p_owner,
      lease_expires_at=now()+make_interval(secs=>greatest(1,p_lease_seconds))
  where r.id=p_run_id and r.task_id=v_task_id
    and (r.lease_expires_at is null or r.lease_expires_at<=now() or r.lease_owner=p_owner)
  returning r.id,r.lease_expires_at;
end;
$$;
revoke execute on function public.claim_run_lease(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.claim_run_lease(uuid,text,integer) to service_role;
-- Manual execution is permitted under the existing RLS policies.
grant execute on function public.claim_run_lease(uuid,text,integer) to authenticated;
