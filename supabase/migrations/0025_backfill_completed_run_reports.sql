-- Backfill completion reports only for safely completed read-only runs.
-- The unique index prevents duplicate report events on retries.
create unique index if not exists activity_logs_one_run_report
on public.activity_logs (run_id) where event_type='run.report' and run_id is not null;
create or replace function public.backfill_completed_run_reports()
returns integer language plpgsql security invoker set search_path=public as $$
declare inserted_count integer;
begin
  with eligible as (
    select r.id,r.finished_at
    from public.runs r
    where r.status='completed'
      and r.finished_at is not null
      and exists(select 1 from public.run_steps s where s.run_id=r.id)
      and not exists(select 1 from public.run_steps s where s.run_id=r.id and s.status<>'completed')
      and not exists(select 1 from public.run_steps s where s.run_id=r.id and s.kind not in ('reason','research','analyze','draft','approval'))
      and not exists(select 1 from public.approvals a where a.run_id=r.id and a.status in ('pending','approved','executing','uncertain'))
      and not exists(select 1 from public.activity_logs l where l.run_id=r.id and l.event_type='run.report')
  ), reports as (
    select e.id,e.finished_at,
      count(s.id)::integer as step_count,
      coalesce(jsonb_agg(jsonb_build_object('position',s.position,'title',s.title,'message',s.output->>'message') order by s.position) filter(where s.id is not null),'[]'::jsonb) as completed_steps,
      max(s.output->>'text') filter(where s.kind='draft') as deliverable
    from eligible e join public.run_steps s on s.run_id=e.id
    group by e.id,e.finished_at
  ), inserted as (
    insert into public.activity_logs(run_id,event_type,message,metadata)
    select id,'run.report',format('Atlas completed %s of %s planned steps.',step_count,step_count),
      jsonb_build_object('summary',format('Atlas completed %s of %s planned steps.',step_count,step_count),
       'deliverable',deliverable,'sources','[]'::jsonb,'completedSteps',completed_steps,'finishedAt',finished_at,'recoveredReport',true)
    from reports
    on conflict do nothing
    returning id
  )
  select count(*) into inserted_count from inserted;
  return inserted_count;
end;$$;
revoke all on function public.backfill_completed_run_reports() from public,anon,authenticated;
grant execute on function public.backfill_completed_run_reports() to service_role;