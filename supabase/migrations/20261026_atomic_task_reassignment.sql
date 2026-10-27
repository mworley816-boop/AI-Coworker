-- Apply to the same Supabase database as Atlas before deploying the matching API.
-- Locks the task and its run rows during the eligibility check and update.
-- All worker claim paths must lock the parent task row before changing run status
-- to guarantee exclusion against a concurrent reassignment.
create or replace function public.reassign_queued_task_atomic(p_task_id uuid,p_coworker_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_task record;
  v_run_ids uuid[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id, coworker_id, status into v_task
    from public.tasks
    where id=p_task_id and user_id=auth.uid()
    for update;
  if not found then return false; end if;
  if v_task.status <> 'queued' then return false; end if;
  if not exists(select 1 from public.coworkers where id=p_coworker_id and user_id=auth.uid()) then return false; end if;
  select array_agg(id) into v_run_ids from (
    select id from public.runs where task_id=p_task_id order by id for update
  ) locked_runs;
  if v_run_ids is null then return false; end if;
  if exists(select 1 from public.runs where id=any(v_run_ids) and status <> 'queued') then return false; end if;
  if exists(select 1 from public.run_steps where run_id=any(v_run_ids) and status <> 'queued') then return false; end if;
  if exists(select 1 from public.approvals where run_id=any(v_run_ids)) then return false; end if;
  update public.tasks set coworker_id=p_coworker_id where id=p_task_id and user_id=auth.uid() and status='queued';
  return found;
end;
$$;
revoke all on function public.reassign_queued_task_atomic(uuid,uuid) from public;
grant execute on function public.reassign_queued_task_atomic(uuid,uuid) to authenticated;
