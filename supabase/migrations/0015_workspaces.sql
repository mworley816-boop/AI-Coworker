create table workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  kind text not null default 'project',
  priority integer not null default 0,
  status text not null default 'active',
  health text not null default 'unknown',
  description text not null default '',
  resources jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,slug)
);
alter table workspaces enable row level security;
create policy workspaces_owner_select on workspaces for select to authenticated using ((select auth.uid())=user_id);
create policy workspaces_owner_insert on workspaces for insert to authenticated with check ((select auth.uid())=user_id);
create policy workspaces_owner_update on workspaces for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy workspaces_owner_delete on workspaces for delete to authenticated using ((select auth.uid())=user_id);
