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

Use a trusted scheduler/runtime to invoke the worker endpoint on a recurring interval. Cloudflare deployment is intentionally paused, so no production scheduler is configured yet.
