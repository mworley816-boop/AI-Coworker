-- Include the non-mutating reasoning step in safe stalled-run finalization.
-- Preserve all existing lease, completion, and approval safeguards.
create or replace function public.finalize_completed_stalled_runs()
returns integer
language plpgsql
set search_path = public
as $$
declare finalized integer;
begin
  with candidates as (
    select r.id, r.task_id
    from runs r
    where r.status='running'
      and r.lease_expires_at is not null
      and r.lease_expires_at<=now()
      and exists (select 1 from run_steps s where s.run_id=r.id)
      and not exists (select 1 from run_steps s where s.run_id=r.id and s.status<>'completed')
      and not exists (select 1 from approvals a where a.run_id=r.id and a.status in ('pending','approved','executing','uncertain'))
      and not exists (select 1 from run_steps s where s.run_id=r.id and s.kind not in ('reason','research','analyze','draft','approval'))
    for update of r skip locked
  ), updated as (
    update runs r
    set status='completed',finished_at=now(),lease_owner=null,lease_expires_at=null
    from candidates c
    where r.id=c.id and r.status='running'
    returning r.id,r.task_id
  ), tasks_updated as (
    update tasks t set status='completed'
    from updated u where t.id=u.task_id
    returning t.id
  )
  select count(*) into finalized from updated;
  return finalized;
end;
$$;
