-- Append-only review decision audit for Atlas perfume proposals.
create table if not exists public.scentmarked_proposal_reviews (
 id uuid primary key default gen_random_uuid(),
 proposal_id uuid not null references public.scentmarked_proposals(id) on delete cascade,
 reviewer_id uuid not null references auth.users(id),
 decision text not null check (decision in ('NEEDS_CHANGES','REJECTED')),
 rationale text not null check (char_length(trim(rationale)) between 10 and 2000),
 created_at timestamptz not null default now()
);
create index if not exists scentmarked_proposal_reviews_proposal_idx on public.scentmarked_proposal_reviews(proposal_id,created_at desc);
alter table public.scentmarked_proposal_reviews enable row level security;
create policy "proposal owners view review history" on public.scentmarked_proposal_reviews for select to authenticated
 using (exists(select 1 from public.scentmarked_proposals p where p.id=proposal_id and p.user_id=auth.uid()));
-- Review entries are written only by a future restricted server-side review endpoint.
-- No authenticated insert, update, or delete policy is granted.
