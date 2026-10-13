alter table public.memories add column if not exists status text not null default 'active';
alter table public.memories add column if not exists source_run_id uuid references public.runs(id) on delete set null;
create index if not exists memories_coworker_status_idx on public.memories(coworker_id,status);