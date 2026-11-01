-- Read-only hosted reviewer RPC readiness check. Execute in Atlas, not Scentmarked.
-- Expected current state: all three functions exist, use SECURITY DEFINER,
-- and currently allow anon EXECUTE. Do not treat these checks as permission fixes.
begin transaction read only;
with expected(name,args) as (values
 ('is_scentmarked_reviewer',''),
 ('list_pending_scentmarked_proposals','integer'),
 ('review_scentmarked_proposal','uuid,text,text')
), actual as (
 select e.name,e.args,p.oid,p.prosecdef,
        case when p.oid is not null then has_function_privilege('anon',p.oid,'EXECUTE') end anon_execute,
        case when p.oid is not null then has_function_privilege('authenticated',p.oid,'EXECUTE') end authenticated_execute,
        case when p.oid is not null then pg_get_functiondef(p.oid) end definition
 from expected e left join pg_proc p
   on p.oid=to_regprocedure(format('public.%I(%s)',e.name,e.args))
)
select name,args,oid is not null as exists_in_database,
       prosecdef as security_definer,anon_execute,authenticated_execute,
       position('auth.uid()' in definition)>0 as contains_identity_check,
       position('scentmarked_reviewers' in definition)>0 as contains_reviewer_check
from actual order by name;
-- After approved hardening, anon_execute should be false and
-- authenticated_execute true for all three rows.
commit;
