-- Atlas Scentmarked incident history (run in the Atlas Supabase project after review).
-- Idempotent schema creation; does not alter Scentmarked's perfume database.
create table if not exists public.atlas_incidents (
  id uuid primary key default gen_random_uuid(),
  project text not null,
  fingerprint text not null,
  source text not null,
  environment text not null default 'unknown',
  status text not null check (status in ('investigating','confirmed','deployment_succeeded','resolved')),
  severity text not null check (severity in ('informational','warning','critical')),
  observed_evidence jsonb not null default '{}'::jsonb,
  recommendation text,
  approval_required boolean not null default true,
  occurrences integer not null default 1 check (occurrences > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (project, fingerprint)
);
create index if not exists atlas_incidents_project_last_seen_idx
  on public.atlas_incidents (project, last_seen_at desc);
alter table public.atlas_incidents enable row level security;
-- Intentionally no client access policies: only trusted server-side service-role
-- processes should access this table. Never expose the service-role key to browsers.
