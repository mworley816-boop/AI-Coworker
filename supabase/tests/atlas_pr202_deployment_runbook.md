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

## Hosted Atlas audit — 2026-10-31
- [x] Read-only hosted function privilege audit: `claim_next_queued_run` is service-role-only; `claim_run_lease` allows authenticated and service_role, denies anon.
- [x] `reassign_queued_task_atomic` is absent; four `20261027010000`–`20261027010003` worker migrations are not in hosted migration history.
- [ ] All three privileged reviewer RPCs still permit anon EXECUTE in hosted Atlas; staged permission hardening remains unapplied. Validate complete reviewer workflow before production change.
- [ ] Obtain fresh encrypted predeployment backup and verify restore of that fresh snapshot.

## Reviewer RPC implementation inspection — 2026-10-31
- [x] Read-only `pg_get_functiondef` inspection of all three hosted reviewer functions completed.
- [x] All three are `SECURITY DEFINER` with an explicit empty `search_path`; reviewer authorization checks use `auth.uid()` and `public.scentmarked_reviewers`.
- [x] Listing requires reviewer membership and caps its result count at 50; review mutation requires reviewer membership, an allowed decision, a rationale of 10–2000 characters, and a pending proposal.
- [ ] Isolated integration test must use the actual function definitions, reviewer and non-reviewer identities, and appropriate synthetic tables before applying the staged permission SQL. Catalog-grant tests using placeholder functions do not prove this behavior.
- [ ] Confirm no application flow relies on anonymous invocation of `is_scentmarked_reviewer()`; anonymous calls will be denied after hardening instead of returning false.

## Hosted reviewer RPC readiness query — 2026-10-31
- [x] Ran `supabase/tests/atlas_reviewer_rpc_predeploy_checks.sql` equivalent read-only query against hosted Atlas project `glsnhuimpzyudofpvlfq`.
- [x] All three expected function signatures exist, use `SECURITY DEFINER`, and contain `auth.uid()` plus `scentmarked_reviewers` references.
- [x] Authenticated role has EXECUTE on all three.
- [ ] Anonymous role still has EXECUTE on all three. Permission hardening remains staged only, not deployed.
- [ ] Function text inspection is not a substitute for integration testing with real reviewer/nonreviewer identities.

## Combined reviewer and concurrency CI — 2026-11-01
- [x] [GitHub Actions run 41286375896](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41286375896) succeeded at commit `d7b318c576ef2ab6475f70f6efb080b26d0155af` on `build/mvp-foundation`: 21 checks passed (4 static permission checks, 4 reviewer grant checks, 2 reviewer workflow checks, 11 worker checks), zero failures.
- [x] The isolated reviewer workflow using recreated hosted function definitions verified membership, decision validation, one-time review, and denial of anonymous calls after staged hardening.
- [ ] Still required: fresh encrypted backup and restore, production-policy compatibility review, deployment-commit quality gates, explicit rollout approval. No production database migration or reviewer permission hardening has been applied by this workflow.


## Current rollout status — 2026-11-01 (supersedes older unchecked historical notes)

Historical sections above are retained as an audit trail. Do **not** interpret their dated
reviewer-RPC warnings or unchecked CI items as current findings.

### Verified since the earlier runbook entries
- [x] Reviewer RPC hardening **applied** to hosted Atlas as migration
  `20261101083809_harden_scentmarked_reviewer_rpc_permissions`. Anonymous
  EXECUTE is revoked for the three reviewer functions; authenticated EXECUTE
  remains granted. Signed-in reviewer queue smoke test loaded successfully.
- [x] Hosted RLS policy definitions were inspected for `tasks`, `runs`,
  `coworkers`, `run_steps`, and `approvals`. Ownership is enforced by
  `auth.uid()` either directly or through the parent task; UPDATE checks
  preserve ownership. This is a policy review, not a full hosted behavioral
  test of the pending worker functions.
- [x] Disposable PostgreSQL worker concurrency including simultaneous
  manual/automatic claims, both sequential reassignment/claim orders, and
  overlapping transactions passed at commit `94189d1bb094efc788315054726c6e10678d6b8d`:
  [worker run 41291095424](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41291095424).
- [x] Verification, batch quality gate and Cloudflare **staging** checks
  passed at that same commit:
  [Verify 41291095364](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41291095364),
  [quality 41291095390](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41291095390),
  [staging 41291095367](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41291095367).
- [x] Encrypted backup [41287280140](https://github.com/mworley816-boop/Atlas-Private-Backups/actions/runs/41287280140)
  and isolated restore [41287375376](https://github.com/mworley816-boop/Atlas-Private-Backups/actions/runs/41287375376)
  completed successfully. This does not replace a fresh backup immediately
  before production rollout.
- [x] Hosted migration history was inspected: the four worker migrations
  `20261027010000` through `20261027010003` were absent at the time
  of inspection. Recheck immediately before deployment.

### Remaining hard stops
- [ ] Confirm rollback owner and maintenance window, and document a safe
  worker-dispatch pause/resume procedure.
- [ ] Confirm the four SQL files and live migration history still match the
  expected order; review any changes since commit `94189d1`.
- [ ] Perform a fresh encrypted backup and verify its restore/integrity
  immediately before deployment. Backup artifacts have short retention.
- [ ] Obtain **explicit user authorization** to deploy the four worker
  migrations to Atlas production. Neither this runbook nor successful CI
  grants deployment authorization.
- [ ] After approval, deploy in the stated order and verify function
  signatures, grants, authenticated ownership checks, worker dispatch,
  reassignment behavior and lease health. Stop on any failed check.

### Rollback cautions
Pause new dispatch before rollback; do not delete the reassignment RPC
while the deployed API depends on it. Restoring earlier function definitions
must be followed by privilege checks, queue/lease reconciliation and
re-running worker smoke tests. A database backup is a last-resort recovery
asset, not a substitute for a function-level rollback plan.


## Production rollout procedure — operator checklist (NOT authorization)

**Scope:** Atlas Supabase project `glsnhuimpzyudofpvlfq` only. Do not
apply these migrations to the Scentmarked database. This procedure is
prepared for a separately approved maintenance window; it must not be
executed automatically by CI.

### Before the maintenance window
1. Name the rollout operator and rollback owner. Agree on a low-traffic
   window, expected duration, communication channel, and stop criteria.
2. Capture current `build/mvp-foundation` commit and verify CI for that
   exact commit. Re-read all four SQL migration files and compare their
   checksums against the approved review.
3. Re-query hosted `supabase_migrations.schema_migrations` and current
   `pg_proc` signatures/grants. Stop if any of the four migrations is
   already recorded or any function definition differs unexpectedly.
4. Verify an operator-tested way to pause **new** worker dispatch while
   allowing in-flight leases to complete. Record queued/running task
   counts and active leases; do not interrupt active work blindly.
5. Create a **fresh encrypted backup** and run the isolated restore with
   application table row-count verification. Confirm the artifact remains
   accessible for the entire rollback window.
6. Obtain explicit user approval naming the Atlas project and the four
   migrations. No approval is implied by a request to continue development.

### Approved maintenance window — stop on first failed gate
1. Announce maintenance and pause new worker dispatch using the verified
   operational control. Wait for or account for active leases.
2. Capture a final baseline: task/run statuses, active leases, function
   definitions and grants, and applied migration versions.
3. Apply in **strict order**, through the normal tracked migration process:
   - `20261027010000_atomic_task_reassignment.sql`
   - `20261027010001_worker_parent_task_claim_lock.sql`
   - `20261027010002_manual_claim_parent_task_lock.sql`
   - `20261027010003_worker_reassignment_lease_guard.sql`
   Re-check the applied version and function signature after each step.
4. Validate `anon`, `authenticated`, and `service_role` EXECUTE
   permissions; reject anonymous reassignment and unauthorized claims.
   Verify authenticated owner/non-owner reassignment on isolated
   disposable fixtures, including active lease denial.
5. Exercise a disposable queued run through manual claim, worker claim,
   and lease expiry/renewal paths. Verify no duplicate active lease,
   no stuck queue, and expected task/coworker relationships.
6. Resume dispatch gradually and observe logs, errors, lease expiry,
   queue depth, and unexpected changes. Record results and completion.

### Stop / rollback decision
If a migration fails, privileges drift, claims double-acquire, leases
become stuck, or queue integrity changes unexpectedly: **keep dispatch
paused**, notify the rollback owner, and assess active transactions.
Restore the previous worker-claim functions from the versioned SQL
sources identified in the rollback section; reapply their exact grants.
Preserve the reassignment RPC while the API depends on it. Verify
function behavior and queue consistency before resuming dispatch.
Escalate to backup restoration only after evaluating data loss and
recovery point; do not blindly restore over live data.

### Record of execution (leave blank until separately approved)
- Operator / rollback owner:
- Maintenance window (with timezone):
- Approved migration commit:
- Explicit approval reference:
- Fresh backup run / restore run:
- Baseline queue and active lease counts:
- Migration versions applied:
- Postdeployment smoke test and monitoring results:
- Rollback required? / reason:


## Worker-dispatch control audit — 2026-11-01

**Observed in repository (not proof of live scheduler configuration):**
- `.github/workflows/atlas-background-worker.yml` schedules every 15
  minutes and POSTs to the hard-coded **staging** worker endpoint.
- `.github/workflows/atlas-staging-worker-scheduler.yml` also schedules
  every 15 minutes and POSTs to a URL from
  `ATLAS_STAGING_WORKER_URL`. The configured URL has not been verified.
- Both workflows permit manual dispatch. A pause must cover **both**
  scheduled triggers, any in-flight GitHub runs, manual invocations, and
  any other configured Cloudflare/external schedulers.
- `docs/background-worker.md` says no production scheduler is configured,
  but this documentation may be stale. Confirm actual production dispatch
  topology before a maintenance window.

**Hard stop:** A verified, reversible pause/resume procedure has **not**
been established. Do not assume that disabling one workflow pauses all
workers. Do not alter scheduler settings or credentials without a separate
operational review and approval. Confirm which endpoints share the hosted
Atlas database and who owns each dispatch source. Record observed active
runs and lease expiry before changing dispatch state.


## Scheduler pause/resume dry-run checklist — not executed

**Purpose:** make the maintenance pause reversible without losing queued work.
The two GitHub schedules are independent and must be assessed separately.

1. In GitHub Actions, inspect the current state and recent runs for
   **Atlas background worker** and **Atlas Staging Worker Scheduler**.
   Record whether each is enabled, its latest dispatch time, and any
   in-progress runs. Check for other worker dispatch sources in Cloudflare
   or external cron systems.
2. Resolve both target URLs to their actual deployed environments and
   confirm whether either uses the Atlas hosted production Supabase
   project. Do not infer database identity from the word *staging*.
3. Before pausing, record queue depth, active leases, lease expiry
   timestamps, and pending approvals. Establish a maximum wait based on
   observed lease durations; never cancel an in-flight action solely to
   speed up deployment.
4. During an **approved** maintenance window, disable scheduling at each
   confirmed dispatch source using its native reversible control.
   Prevent manual dispatch through operator coordination/access control.
   Verify that no new worker invocations occur while waiting for
   in-flight work to settle.
5. If any scheduler cannot be paused safely, abort the rollout and
   restore the previous scheduling state. Do not rotate worker secrets
   as an improvised pause mechanism.
6. After migration and smoke checks, re-enable exactly the sources that
   were previously enabled. Observe a normal batch, lease health and
   queue movement. Record before/after scheduler states and timestamps.

**Dry-run result:** not performed; live scheduler enablement, endpoint
database mappings, and non-GitHub dispatchers are not yet verified.
No scheduling change is authorized by this checklist.


## Staging endpoint → database mapping audit — 2026-11-01

- The active `Atlas background worker` scheduled run
  [41289700976](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41289700976)
  invoked `https://ai-coworker-staging.m-worley816.workers.dev/api/worker/run`;
  its logs show HTTP 200, `ok:true`, `processed:0`, and `idle:true`.
  This proves endpoint responsiveness, **not** database identity.
- `wrangler.jsonc` names the deployed Worker `ai-coworker-staging`.
  It does not contain a Supabase project URL.
- `.github/workflows/deploy-cloudflare-staging.yml` passes
  `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from
  GitHub Actions secrets to `npm run deploy`. Those secret values
  cannot be inferred from the repository and must not be printed.
- `src/lib/runtime-env.ts` resolves runtime bindings from the
  Cloudflare environment, falling back to `process.env`.
- Therefore, the actual staging Worker → Supabase project mapping
  **remains unverified**. Before production rollout, an authorized
  operator should compare only the nonsecret Supabase project ref
  embedded in the configured URL with the Atlas project
  `glsnhuimpzyudofpvlfq`, using a protected diagnostic or secure
  configuration inspection. Never log service-role credentials.
- The other scheduler's configured `ATLAS_STAGING_WORKER_URL` must
  likewise be checked without disclosing its worker bearer token.
  The word `staging` alone does not guarantee database isolation.


## Verified worker mapping and maintenance guard — 2026-11-01

- [Manual authenticated mapping check #41332606767](https://github.com/mworley816-boop/AI-Coworker/actions/runs/41332606767) succeeded against the deployed staging worker and printed `atlasProjectMatch=true`. Thus the configured Supabase URL matches the **production Atlas project** `glsnhuimpzyudofpvlfq`. This supersedes the earlier *unverified* mapping statement above; it does not prove that every alternate scheduler points to the same endpoint.
- `src/app/api/worker/run/route.ts` now reads Cloudflare runtime bindings and, after authenticating, returns `{ok:true,paused:true,processed:0,failed:0}` without running recovery or claim RPCs when `ATLAS_WORKER_MAINTENANCE_MODE` is exactly `true`.
- The authenticated `/api/worker/status` response reports `maintenanceMode`, `running`, `queued`, `expiredLeases`, and `stalledRuns` for operator observation. A normal status response alone is **not** proof that no worker invocation is in flight.
- This flag is **off by default** and has **not been enabled**. The flag is an admission guard, **not a database-wide lock**. All dispatch sources must be checked, and in-flight worker requests must be allowed to drain. Never infer safe drain merely from a zero `running` count: inspect leases and dispatch logs as well.
- Added unit tests for default-off and explicit-on behavior in `src/lib/maintenance/worker-maintenance.test.ts`; CI must pass at the final commit before relying on the guard. No live paused-mode test has been performed.
- The staging worker shares production data. Do not activate maintenance mode or apply any of the four worker migrations without separately approved maintenance operations.
