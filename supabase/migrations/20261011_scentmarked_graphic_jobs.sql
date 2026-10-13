-- Atlas-owned queue; Scentmarked production catalog is not modified.
create table if not exists public.scentmarked_graphic_jobs (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 perfume_id text not null,
 brand text not null,
 perfume_name text not null,
 graphic_format text not null check (graphic_format in ('product-card','editorial-banner')),
 prompt text not null,
 status text not null default 'queued' check (status in ('queued','generating','generated','held','failed','approved','uploaded')),
 generation_job_id text,
 output_storage_path text,
 rights_cleared boolean not null default false,
 identity_verified boolean not null default false,
 error_code text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint graphic_jobs_identity_not_empty check (length(trim(perfume_id))>0 and length(trim(brand))>0 and length(trim(perfume_name))>0)
);
create index if not exists scentmarked_graphic_jobs_owner_status_idx on public.scentmarked_graphic_jobs(owner_user_id,status,created_at);
alter table public.scentmarked_graphic_jobs enable row level security;
create policy "Graphic job owners may read" on public.scentmarked_graphic_jobs for select to authenticated using (owner_user_id=auth.uid());
create policy "Graphic job owners may enqueue" on public.scentmarked_graphic_jobs for insert to authenticated with check (owner_user_id=auth.uid() and status='queued' and not rights_cleared and not identity_verified and generation_job_id is null and output_storage_path is null);
-- Updates/deletes intentionally withheld from user role; worker uses audited service operations later.
