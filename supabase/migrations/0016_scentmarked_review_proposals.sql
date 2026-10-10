-- Review-only perfume proposals belong to the signed-in Atlas user.
create table if not exists public.scentmarked_proposals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 brand text not null,
 perfume_name text not null,
 description text not null default '',
 notes text not null default '',
 source_leads jsonb not null default '[]'::jsonb,
 duplicate_check_status text not null,
 review_status text not null default 'PENDING_ADMIN_REVIEW'
   check (review_status in ('PENDING_ADMIN_REVIEW','REJECTED','APPROVED_FOR_FUTURE_INTEGRATION')),
 created_at timestamptz not null default now()
);
create index if not exists scentmarked_proposals_owner_created_idx on public.scentmarked_proposals(user_id,created_at desc);
alter table public.scentmarked_proposals enable row level security;
create policy "owners read proposals" on public.scentmarked_proposals for select to authenticated using (auth.uid()=user_id);
create policy "owners submit pending proposals" on public.scentmarked_proposals for insert to authenticated with check (auth.uid()=user_id and review_status='PENDING_ADMIN_REVIEW');
-- No client update/delete policy: approvals and edits are deliberately not implemented.
