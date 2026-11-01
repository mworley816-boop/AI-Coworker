# Background worker

AI Coworker exposes an authenticated worker endpoint at `POST /api/worker/run`.

## Required server environment

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WORKER_SECRET`

Never expose the service-role key or worker secret to browser code.

## Scheduler request

Call `POST /api/worker/run` with:

`Authorization: Bearer <WORKER_SECRET>`

Optional header `x-worker-batch-size` controls how many queued runs are processed per invocation. Values are clamped to 1–20 and default to 5.

The endpoint returns the worker id, batch size, duration, number of processed runs, and whether the queue became idle.

## Health

`GET /api/worker/health` reports whether required worker configuration is present without exposing secrets.

## Deployment

The deployed Cloudflare staging worker currently connects to the hosted production Atlas Supabase project. The primary GitHub Actions background-worker schedule on the repository default branch invokes that endpoint; the secondary staging schedule is gated by a GitHub variable and has recently skipped. Check both live workflow definitions and any Cloudflare dashboard Cron Triggers before maintenance. Do not assume the staging label indicates database isolation.

## Maintenance admission guard

Set `ATLAS_WORKER_MAINTENANCE_MODE=true` in the deployed worker runtime only during a separately approved maintenance window. Authenticated `POST /api/worker/run` requests then return `paused:true` without starting recovery or claiming a new run. The flag is off by default. Authenticated `GET /api/worker/status` reports `maintenanceMode`, queue and lease counts. This guard does not stop in-flight requests or other clients of the database; drain active work and audit all dispatch sources before migrations. Do not enable the flag as part of a documentation-only change.

## Safety and recovery

Queued work is claimed atomically in PostgreSQL. Worker batches reconcile expired leases before claiming new work. Stalled runs that have no ambiguous external action can be safely requeued; runs interrupted while an action approval is executing are quarantined as uncertain instead of being repeated automatically.

Lease heartbeats are monitored. A worker reports failure if it loses its lease, allowing operations to investigate rather than silently treating the invocation as healthy.

## Recommended scheduler behavior

Invoke the worker endpoint on a recurring interval only after the application has a stable deployment URL and server secrets are configured. A scheduler should treat non-2xx responses as failures and use the status endpoint for operational visibility. Do not retry an uncertain external action automatically.
