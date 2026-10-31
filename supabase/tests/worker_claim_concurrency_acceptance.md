# Atlas worker claim concurrency — executable test plan

**Status:** Test specification only; no test run or production deployment is implied.

## Setup
Use an isolated PostgreSQL 17/Supabase test database with the Atlas schema and all four worker-locking migrations in their intended order. Seed two distinct users, two coworkers belonging to one user, two queued tasks, one queued run per task, and the necessary policies. Use independent connections for every concurrent session. Never use hosted production records.

## Case 1: Two automatic workers, one run
- Open two sessions; coordinate them with a barrier so both attempt `claim_next_queued_run` at the same time.
- Assert that no more than one worker acquires the single run's active lease.
- Assert that a worker which cannot claim the locked task returns promptly instead of blocking indefinitely.

## Case 2: Manual and automatic claims
- Start a manual `claim_run_lease` and an automatic `claim_next_queued_run` concurrently on the same queued run.
- Confirm both paths take the parent task lock before the child run lock.
- Verify final lease owner is consistent with the intended same-owner renewal/lease-expiry policy. A later claim by a different owner must not steal an unexpired lease.

## Case 3: Reassignment versus claim
- Hold the task lock in session A, attempt worker claim in session B, and attempt `reassign_queued_task_atomic` as the authenticated owner in session C.
- Test both orderings. Reassignment must either commit before claim or return false after an active lease is established.
- Confirm the coworker assignment, run status, and lease state are mutually consistent.

## Case 4: Reassignment eligibility and authorization
- Reject reassignment of a running or completed task.
- Reject reassignment when any associated run is active or any run step has started, or an approval exists.
- Reject non-owner access and cross-user coworker assignments.

## Case 5: Different tasks
- Run claims concurrently for different tasks.
- Assert that both can proceed, with no deadlocks or unexpected blocking.

## Case 6: Lease expiration and renewal
- Verify an unexpired lease cannot be stolen by a different owner.
- Verify expiry permits the documented recovery path.
- Verify same-owner renewal and lease duration lower bounds.

## Exit criteria
- Run each race repeatedly under a timeout; capture only sanitized statuses, elapsed times, and aggregate assertions.
- Verify grants and RLS for the three function signatures; inspect for deadlocks and stuck leases.
- Save a successful CI run URL in the deployment runbook before marking the concurrency gate complete.
- Keep production migrations blocked until backup row-count verification and explicit rollout approval are complete.
