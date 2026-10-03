create table if not exists public.coworker_tool_permissions (
  id uuid primary key default gen_random_uuid(),
  coworker_id uuid not null references public.coworkers(id) on delete cascade,
  tool_id text not null,
  enabled boolean not null default false,
  access text not null check (access in ('read','write')),
  approval_mode text not null default 'always' check (approval_mode in ('never','always')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(coworker_id,tool_id)
);
alter table public.coworker_tool_permissions enable row level security;
create index if not exists coworker_tool_permissions_coworker_idx on public.coworker_tool_permissions(coworker_id);