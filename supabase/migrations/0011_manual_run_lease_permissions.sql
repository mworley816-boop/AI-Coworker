-- Manual execution uses the authenticated server client after verifying run ownership.
-- claim_run_lease is SECURITY INVOKER, so existing RLS still limits authenticated callers
-- to runs they can access. Background queue/recovery coordination remains service-role only.
grant execute on function public.claim_run_lease(uuid,text,integer) to authenticated;
