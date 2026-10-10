-- Atomic incident observation for trusted Atlas server-side callers.
-- Only apply to the AI-Coworker database. This function is not exposed to
-- anon/authenticated users; grant EXECUTE only to service_role.
create or replace function public.atlas_record_incident(
  p_project text,
  p_fingerprint text,
  p_source text,
  p_environment text,
  p_status text,
  p_severity text,
  p_observed_evidence jsonb default '{}'::jsonb,
  p_recommendation text default null,
  p_approval_required boolean default true
)
returns public.atlas_incidents
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved public.atlas_incidents;
begin
  if p_project is null or p_fingerprint is null or p_source is null
     or length(p_fingerprint) = 0 then
    raise exception 'Missing required incident identity';
  end if;
  insert into public.atlas_incidents (
    project, fingerprint, source, environment, status, severity,
    observed_evidence, recommendation, approval_required
  ) values (
    p_project, p_fingerprint, p_source, p_environment, p_status, p_severity,
    coalesce(p_observed_evidence, '{}'::jsonb), p_recommendation, p_approval_required
  )
  on conflict (project, fingerprint) do update set
    source = excluded.source,
    environment = excluded.environment,
    status = excluded.status,
    severity = excluded.severity,
    observed_evidence = excluded.observed_evidence,
    recommendation = excluded.recommendation,
    approval_required = excluded.approval_required,
    occurrences = public.atlas_incidents.occurrences + 1,
    last_seen_at = now()
  returning * into saved;
  return saved;
end;
$$;
revoke all on function public.atlas_record_incident(text,text,text,text,text,text,jsonb,text,boolean) from public, anon, authenticated;
grant execute on function public.atlas_record_incident(text,text,text,text,text,text,jsonb,text,boolean) to service_role;
