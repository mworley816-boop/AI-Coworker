alter table public.memories add column if not exists expires_at timestamptz;
create index if not exists memories_active_expiry_idx on public.memories(coworker_id,status,expires_at);