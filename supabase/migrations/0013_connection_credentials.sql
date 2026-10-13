-- Encrypted provider credentials. Only the service role may access this table.
create table public.connection_credentials (
  connection_id uuid primary key references public.connections(id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  key_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.connection_credentials enable row level security;
revoke all on table public.connection_credentials from public, anon, authenticated;
grant select, insert, update, delete on table public.connection_credentials to service_role;
comment on table public.connection_credentials is 'Encrypted personal provider credentials. Decryption keys remain server-side and are never stored in Supabase.';
