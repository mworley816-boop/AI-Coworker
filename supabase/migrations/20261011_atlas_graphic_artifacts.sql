-- Atlas-only private holding bucket for generated graphics pending identity and rights review.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('atlas-graphic-artifacts','atlas-graphic-artifacts',false,5242880,array['image/png'])
on conflict (id) do nothing;
-- No public or authenticated storage write policies: only privileged Atlas service may write.
