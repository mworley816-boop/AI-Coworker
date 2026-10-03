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
create policy "owners manage coworker tool permissions" on public.coworker_tool_permissions for all using (exists(select 1 from public.coworkers c where c.id=coworker_tool_permissions.coworker_id and c.user_id=auth.uid())) with check (exists(select 1 from public.coworkers c where c.id=coworker_tool_permissions.coworker_id and c.user_id=auth.uid()));
