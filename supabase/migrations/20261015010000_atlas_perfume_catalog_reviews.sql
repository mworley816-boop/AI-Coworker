-- Atlas-only reviewer decisions for Arabiyat catalog comparisons.
-- Never writes to Scentmarked production. Access is service-role only;
-- API handlers must authenticate and scope every operation by owner_user_id.
create table if not exists public.atlas_perfume_catalog_reviews (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 house text not null check (length(trim(house)) between 1 and 120),
 perfume_name text not null check (length(trim(perfume_name)) between 1 and 180),
 decision text not null default 'needs_research'
  check (decision in ('needs_research','existing_alternate','candidate','excluded')),
 reviewer_notes text not null default '' check (length(reviewer_notes) <= 4000),
 source_url text,
 source_type text,
 discontinued_status text not null default 'unverified',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(owner_user_id,house,perfume_name)
);
create index if not exists atlas_perfume_catalog_reviews_owner_idx
 on public.atlas_perfume_catalog_reviews(owner_user_id,updated_at desc);
alter table public.atlas_perfume_catalog_reviews enable row level security;
revoke all on public.atlas_perfume_catalog_reviews from public,anon,authenticated;
grant select,insert,update,delete on public.atlas_perfume_catalog_reviews to service_role;
