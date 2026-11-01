-- Atlas pre-deployment audit: READ ONLY. Run against the Atlas project,
-- never the Scentmarked project. No data writes, DDL or permission changes.
begin transaction read only;
-- Expected worker and reassignment function definitions and current privileges.
select p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_can_execute,
       has_function_privilege('service_role',p.oid,'EXECUTE') as service_can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('claim_next_queued_run','claim_run_lease',
    'reassign_queued_task_atomic','is_scentmarked_reviewer',
    'list_pending_scentmarked_proposals','review_scentmarked_proposal')
order by p.proname,arguments;
-- RLS and owner policies on the worker's core tables.
select c.relname as table_name,c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as force_rls,
       p.policyname,p.roles,p.cmd,p.qual,p.with_check
from pg_class c join pg_namespace n on n.oid=c.relnamespace
left join pg_policies p on p.schemaname=n.nspname and p.tablename=c.relname
where n.nspname='public' and c.relname in
  ('tasks','runs','coworkers','run_steps','approvals')
order by c.relname,p.policyname;
-- Supabase migration versions (confirm before applying pending worker migrations).
select version,name from supabase_migrations.schema_migrations
where version >= '20261027010000' order by version;
commit;
