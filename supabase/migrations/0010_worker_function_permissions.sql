-- Worker coordination functions are privileged server-side operations.
-- Keep them unavailable to browser-facing anon/authenticated roles.
revoke execute on function public.claim_run_lease(uuid,text,integer) from public, anon, authenticated;
revoke execute on function public.claim_next_queued_run(text,integer) from public, anon, authenticated;
revoke execute on function public.recover_expired_run_leases() from public, anon, authenticated;
revoke execute on function public.reconcile_stalled_runs() from public, anon, authenticated;

grant execute on function public.claim_run_lease(uuid,text,integer) to service_role;
grant execute on function public.claim_next_queued_run(text,integer) to service_role;
grant execute on function public.recover_expired_run_leases() to service_role;
grant execute on function public.reconcile_stalled_runs() to service_role;
