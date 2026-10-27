# Atlas PR #202 — deployment runbook

## Prerequisites
- GitHub PR #202 remains draft until rollout approval.
- Disposable PostgreSQL concurrency workflow, Verify, and batch quality gate must be green.
- Hosted AI-Coworker Supabase project: `glsnhuimpzyudofpvlfq`. Never target the Scentmarked project.
- Take a backup / confirm restore procedure and select a low-traffic maintenance window.

## Required database order
1. Install the **base-branch** migration `supabase/migrations/20261027010000_atomic_task_reassignment.sql` first. The deployed reassignment API already invokes `reassign_queued_task_atomic`, which was missing on 2026-10-26.
2. Install `20261027010001_worker_parent_task_claim_lock.sql`.
3. Install `20261027010002_manual_claim_parent_task_lock.sql`.
4. Install `20261027010003_worker_reassignment_lease_guard.sql` last to replace the initial reassignment function with active-lease rejection.

Use proper unique timestamped migration names when applying through Supabase CLI. The three PR #202 migrations use distinct 14-digit timestamp prefixes; verify their ordering against the existing migration history before deploying.

## Verification after migration
- Inspect `pg_proc` for the three expected function signatures.
- Verify function EXECUTE privileges for `anon`, `authenticated`, and `service_role`.
- Verify reassignment as an authenticated owner (and reject a non-owner) with test data.
- Verify worker claim and manual lease claims with disposable queued tasks.
- Confirm Atlas background worker execution and reassignment API behavior.
- Confirm no stuck run leases or unexpected activity logs.

## Rollback
- Stop new worker dispatch before any rollback.
- Restore the previous worker-claim function definitions from migrations `0006_claim_run_lease.sql` and `0007_worker_run_claim.sql`, and reapply permissions from `0010_worker_function_permissions.sql` and `0011_manual_run_lease_permissions.sql`.
- Do not remove the reassignment function while a deployed API still invokes it.
- Re-run smoke checks and review queued/running task consistency.

## Safety
No migration has been applied by this runbook. Do not merge or deploy until the migration names, order, and hosted RLS checks are reviewed.
