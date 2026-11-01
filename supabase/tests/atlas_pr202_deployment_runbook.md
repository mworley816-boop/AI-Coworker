# Atlas worker concurrency migrations — deployment runbook

## Prerequisites
- PR #202 has been merged; merging does **not** authorize production database changes.
- Obtain explicit rollout approval after all gates below pass.
- Disposable PostgreSQL concurrency workflow, Verify, and batch quality gate must be green.
- Hosted AI-Coworker Supabase project: `glsnhuimpzyudofpvlfq`. Never target the Scentmarked project.
- Encrypted backup creation has passed and disposable application schema/data restoration has passed.
- **PASSED for the tested snapshot:** the additional COPY row-count integrity check passed in backup restore run 41226499495 (21/21 tables). A fresh pre-deployment backup is still required.
- Confirm artifact availability or create a fresh encrypted backup if the one-day retention window has expired.
- Select a low-traffic maintenance window and confirm a rollback owner.

## Pre-deployment gates (all required)
- [x] Restore workflow completed with verified application COPY row counts: [run 41226499495](https://github.com/mworley816-boop/Atlas-Private-Backups/actions/runs/41226499495). Obtain a fresh backup for deployment.
- [x] Disposable PostgreSQL concurrency tests passed for competing worker claims and reassignment, including active lease rejection: [run 41261859072](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41261859072).
  - [x] Static worker migration contract tests passed (5/5) in [GitHub Actions run 41205692233](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41205692233); these do not substitute for database-level concurrency tests.
  - [x] Disposable PostgreSQL 17 smoke test passed in [GitHub Actions run 41207291096](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41207291096): two concurrent worker claims acquired distinct tasks; manual lease stealing rejected; same-owner renewal and expired-lease recovery passed.
  - [x] Parent task-lock exclusion, owner authorization, active lease rejection and synthetic authenticated-role RLS tests passed. [Run 41261859072](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41261859072). Full production-policy compatibility and exhaustive deadlock testing remain separate gates.
  - [x] Two automatic workers competing for one queued run cannot both acquire an active lease — five race attempts passed in [run 41209876719](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41209876719).
  - [ ] Manual claim and automatic claim on the same run serialize through the parent task lock.
  - [x] Parent task-lock exclusion and active-lease rejection tested; full end-to-end production race still requires verification.
  - [x] Non-owner reassignment and active-lease rejection tested; non-queued task state coverage should be verified separately.
  - [ ] Concurrent claims across different tasks can progress without deadlock or indefinite waiting.
  - [x] Lease expiry and same-owner renewal passed in disposable PostgreSQL.
- [ ] Verify, typecheck/build, and batch quality gate pass on the deployment commit.
- [ ] Compare the hosted migration history to the four migration filenames and confirm ordering; do not assume the files are unapplied.
- [ ] Review function grants, hosted RLS expectations, and a rollback plan.
- [ ] Receive explicit approval for production migration deployment.

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
No migration has been applied by this runbook. Do not apply production migrations until every pre-deployment gate is confirmed. Development and non-production testing may continue while the restore integrity gate is pending.

- [x] Disposable PostgreSQL task-lock exclusion test passed in [GitHub Actions run 41214962458](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41214962458): a parent task row held FOR UPDATE blocks worker claiming until released. Full atomic reassignment and authorization testing remain pending.

- [x] Atomic task reassignment PostgreSQL smoke checks passed in [run 41224744776](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41224744776): authorized queued-task reassignment, cross-user denial, and active-lease denial; 9/9 total checks passed. Production RLS/privilege verification and backup-integrity gate remain pending.

- [x] PostgreSQL RPC privilege smoke checks passed in [run 41225145508](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41225145508): 10/10 checks including anon/authenticated/service_role EXECUTE grants. Real Supabase RLS and backup verification remain required.

- [x] Encrypted Atlas backup successfully restored in disposable Supabase with 21/21 application COPY row counts matching restored tables: [backup run 41226499495](https://github.com/mworley816-boop/Atlas-Private-Backups/actions/runs/41226499495). This verifies that specific backup, not a fresh production snapshot; RLS checks and deployment authorization remain pending.

- [x] Authenticated-role synthetic RLS ownership smoke test passed in [run 41227661114](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41227661114): 11/11 total PostgreSQL checks passed. Live Supabase policies still require independent verification.

## Reviewer RPC permissions (separate proposed change)
- [x] Four static permission-contract checks and three disposable PostgreSQL grant checks passed in [run 41261859072](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41261859072).
- [ ] Validate full reviewer workflow with real function implementations in an isolated environment; stubs only prove grants.
- [ ] Review and approve the staged SQL at `supabase/tests/reviewer-rpc-permission-hardening.sql`; it is not a deployed migration.
- [ ] Re-check hosted security advisor after any approved rollout.

## Live-project read-only review
- Hosted migration history inspected: the four `20261027010000`–`20261027010003` migrations were not listed as applied.
- Hosted ownership policies for `tasks`, `runs`, `coworkers`, `run_steps`, and `approvals` were inspected. The synthetic RLS test does not substitute for a production-policy integration test.
- Hosted security advisor flagged three anonymous-executable reviewer `SECURITY DEFINER` functions, six RLS-enabled tables without policies (possibly intentional service-only), and disabled leaked-password protection. Review each finding separately before changing permissions.
