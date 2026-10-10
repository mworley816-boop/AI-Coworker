alter table runs add column if not exists lease_owner text;
alter table runs add column if not exists lease_expires_at timestamptz;
create index if not exists runs_lease_expires_idx on runs(lease_expires_at) where lease_expires_at is not null;
