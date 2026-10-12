-- Enforce at most one active research job per owner and normalized perfume identity.
-- Held/failed jobs can be retried; approved history remains preserved.
create unique index if not exists atlas_perfume_research_active_identity_idx
on public.atlas_perfume_research_jobs (
 owner_user_id,
 lower(btrim(house)),
 lower(btrim(perfume_name))
)
where status in ('queued','researching','draft_ready');
