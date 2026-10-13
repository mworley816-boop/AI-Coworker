create or replace function reconcile_stalled_runs()
returns table(requeued integer,quarantined integer)
language plpgsql
security invoker
set search_path=public
as $$
declare v_requeued integer:=0;
declare v_quarantined integer:=0;
begin
  with unsafe as (
    select distinct r.id
    from runs r
    join approvals a on a.run_id=r.id and a.status='executing'
    where r.status='running' and r.lease_expires_at is not null and r.lease_expires_at<=now()
  ), marked as (
    update approvals a set status='uncertain'
    from unsafe u where a.run_id=u.id and a.status='executing'
    returning a.run_id
  ), failed as (
    update runs r set status='failed',finished_at=coalesce(r.finished_at,now()),lease_owner=null,lease_expires_at=null
    where r.id in (select id from unsafe)
    returning r.id
  )
  select count(*) into v_quarantined from failed;

  with safe as (
    select r.id
    from runs r
    where r.status='running' and r.lease_expires_at is not null and r.lease_expires_at<=now()
      and not exists(select 1 from approvals a where a.run_id=r.id and a.status in ('executing','uncertain'))
      and not exists(
        select 1 from run_steps s
        where s.run_id=r.id and s.status='running'
          and (s.kind='approval' or coalesce(s.input->>'actionToolId','')<>'')
      )
  ), reset_steps as (
    update run_steps s set status='queued'
    where s.run_id in (select id from safe) and s.status='running'
    returning s.run_id
  ), reset_runs as (
    update runs r set status='queued',lease_owner=null,lease_expires_at=null,finished_at=null
    where r.id in (select id from safe)
    returning r.id
  )
  select count(*) into v_requeued from reset_runs;

  return query select v_requeued,v_quarantined;
end;
$$;
