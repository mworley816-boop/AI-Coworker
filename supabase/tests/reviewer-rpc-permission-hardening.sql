-- Proposed Atlas reviewer RPC hardening. REVIEW ONLY; not applied to production.
-- The functions retain their internal auth.uid()/reviewer membership checks.
-- PUBLIC is a PostgreSQL pseudo-role inherited by anon and authenticated.
-- Revoking from PUBLIC removes the implicit EXECUTE grant; grant back only to
-- authenticated, preserving reviewer workflow for signed-in users.
begin;
revoke execute on function public.is_scentmarked_reviewer() from public, anon;
revoke execute on function public.list_pending_scentmarked_proposals(integer) from public, anon;
revoke execute on function public.review_scentmarked_proposal(uuid,text,text) from public, anon;
grant execute on function public.is_scentmarked_reviewer() to authenticated;
grant execute on function public.list_pending_scentmarked_proposals(integer) to authenticated;
grant execute on function public.review_scentmarked_proposal(uuid,text,text) to authenticated;
commit;
