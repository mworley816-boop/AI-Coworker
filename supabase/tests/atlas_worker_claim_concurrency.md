# Atlas worker claim / reassignment concurrency regression

Run against an isolated Supabase test database with migrations through
`20261026_atomic_task_reassignment.sql` and
`20261026_worker_parent_task_claim_lock.sql` installed.
Never run these tests against production tasks.

## Setup
Create a test owner, two owned coworkers, a queued task and queued run
with no approvals or progressed steps. Use the service role for worker
claims and an authenticated owner session for reassignment.

## Race A: reassignment holds the task lock
Session A (owner): `BEGIN;` then
`SELECT id FROM public.tasks WHERE id = '<task_uuid>' FOR UPDATE;`
Keep the transaction open.
Session B (service role): call
`SELECT * FROM public.claim_next_queued_run('worker-B',60);`
Expected: it does **not** claim the locked task/run (returns zero rows
if there are no other eligible tasks). Session A can reassign within
the transaction. After A commits, a subsequent worker claim succeeds.

## Race B: worker holds the task lock
Session A (service role): `BEGIN;` then
`SELECT * FROM public.claim_next_queued_run('worker-A',60);`
Do not commit yet.
Session B (authenticated owner): call
`SELECT public.reassign_queued_task_atomic('<task_uuid>','<coworker_uuid>');`
Expected: B waits for A to commit; once A commits, B returns false
because the run now has an active lease (see note below).

## Race C: two workers
Run two simultaneous service-role calls to `claim_next_queued_run`
with different owners and one eligible queued task/run.
Expected: at most one claim returns that run while its lease is valid.

## Critical integration check
The original reassignment RPC checks run status, but the worker claim
sets a lease without changing status. Therefore **Race B will currently
fail** unless reassignment also rejects active leases. Do not deploy
this migration alone as an end-to-end concurrency fix. Update the
reassignment RPC to reject any active run lease and verify Race B.

## Other checks
Confirm the worker's existing lease renewal, recovery, approval gates,
and uncertain-action quarantine still pass the existing test suite.
