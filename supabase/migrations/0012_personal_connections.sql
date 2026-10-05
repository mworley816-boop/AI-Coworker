-- Personal account connections for Atlas. OAuth secrets/tokens are intentionally not stored here.
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  label text not null,
  status text not null default 'disconnected' check (status in ('disconnected','connecting','connected','error','revoked')),
  external_account_id text,
  scopes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider, label)
);

alter table public.connections enable row level security;

create policy "Users manage own connections"
on public.connections
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index connections_user_provider_idx on public.connections(user_id, provider);

comment on table public.connections is 'Non-secret metadata for the personal accounts Atlas may use. Provider credentials belong in a server-side secret/token store.';
