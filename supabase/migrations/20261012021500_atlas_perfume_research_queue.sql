-- Atlas-only, service-managed perfume research queue.
-- No access granted to anon/authenticated; API must enforce admin and ownership.
create table if not exists public.atlas_perfume_research_jobs (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 house text not null check (length(trim(house)) between 1 and 120),
 perfume_name text not null check (length(trim(perfume_name)) between 1 and 180),
 status text not null default 'queued' check (status in ('queued','researching','draft_ready','approved','held','failed')),
 source_url text,
 source_type text check (source_type in ('manufacturer','retailer','community')),
 draft_payload jsonb,
 error_code text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint atlas_perfume_research_source_pair check ((source_url is null) = (source_type is null))
);
create index if not exists atlas_perfume_research_jobs_owner_created_idx
 on public.atlas_perfume_research_jobs(owner_user_id,created_at desc);
create index if not exists atlas_perfume_research_jobs_status_created_idx
 on public.atlas_perfume_research_jobs(status,created_at);
alter table public.atlas_perfume_research_jobs enable row level security;
revoke all on public.atlas_perfume_research_jobs from public,anon,authenticated;
grant select,insert,update,delete on public.atlas_perfume_research_jobs to service_role;
