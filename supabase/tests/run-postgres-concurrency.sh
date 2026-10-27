#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to a disposable PostgreSQL database}"
export PGCONNECT_TIMEOUT=10
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
create extension if not exists pgcrypto;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
do $$begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end$$;
create table coworkers(id uuid primary key,user_id uuid not null);
create table tasks(id uuid primary key,user_id uuid not null,coworker_id uuid not null,status text not null default 'queued',created_at timestamptz not null default now());
create table runs(id uuid primary key,task_id uuid not null references tasks(id),status text not null default 'queued',created_at timestamptz not null default now(),lease_owner text,lease_expires_at timestamptz);
create table run_steps(id uuid primary key,run_id uuid not null,status text not null default 'queued');
create table approvals(id uuid primary key,run_id uuid not null);
SQL
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20261026_worker_parent_task_claim_lock.sql >/dev/null
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20261026_worker_reassignment_lease_guard.sql >/dev/null
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20261026_manual_claim_parent_task_lock.sql >/dev/null
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
insert into coworkers values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111'),('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','11111111-1111-1111-1111-111111111111');
insert into tasks values ('cccccccc-cccc-cccc-cccc-cccccccccccc','11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','queued',now());
insert into runs(id,task_id) values ('dddddddd-dddd-dddd-dddd-dddddddddddd','cccccccc-cccc-cccc-cccc-cccccccccccc');
SQL
# Two competing worker claims must yield exactly one lease.
psql "$DATABASE_URL" -At -c "select id from public.claim_next_queued_run('worker-a',60)" > /tmp/atlas-claim-a &
a=$!
psql "$DATABASE_URL" -At -c "select id from public.claim_next_queued_run('worker-b',60)" > /tmp/atlas-claim-b &
b=$!
wait "$a";wait "$b"
count=$(cat /tmp/atlas-claim-a /tmp/atlas-claim-b | grep -c '^dddddddd-dddd-dddd-dddd-dddddddddddd$' || true)
test "$count" -eq 1 || { echo "Expected one worker claim, got $count"; exit 1; }
# An active lease must prevent reassignment, even when run status is queued.
result=$(psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 <<'SQL'
set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111';
select public.reassign_queued_task_atomic('cccccccc-cccc-cccc-cccc-cccccccccccc','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SQL
)
test "${result##*$'\n'}" = f || { echo "Active lease allowed reassignment"; exit 1; }
# Manual claims must not replace an active lease.
manual=$(psql "$DATABASE_URL" -At -c "select id from public.claim_run_lease('dddddddd-dddd-dddd-dddd-dddddddddddd','manual',60)")
test -z "$manual" || { echo "Manual claim stole an active lease"; exit 1; }
# Expired leases can be reclaimed.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "update runs set lease_expires_at=now()-interval '1 second' where id='dddddddd-dddd-dddd-dddd-dddddddddddd'" >/dev/null
reclaimed=$(psql "$DATABASE_URL" -At -c "select id from public.claim_run_lease('dddddddd-dddd-dddd-dddd-dddddddddddd','manual',60)")
test "$reclaimed" = dddddddd-dddd-dddd-dddd-dddddddddddd || { echo "Expired lease could not be reclaimed"; exit 1; }
echo "PostgreSQL lease and reassignment smoke tests passed."


# Deterministic worker-vs-reassignment race: hold parent task lock while
# committing a new worker lease, then ensure the waiting reassignment fails.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "update public.runs set lease_owner=null,lease_expires_at=null where id='dddddddd-dddd-dddd-dddd-dddddddddddd'" >/dev/null
ready_file=$(mktemp)
rm -f "$ready_file"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 > /dev/null <<SQL &
begin;
select 1 from public.tasks where id='cccccccc-cccc-cccc-cccc-cccccccccccc' for update;
select pg_sleep(2);
select id from public.claim_run_lease('dddddddd-dddd-dddd-dddd-dddddddddddd','race-worker',60);
commit;
SQL
holder=$!
sleep 0.5
psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 > "$ready_file" <<'SQL' &
set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111';
select public.reassign_queued_task_atomic('cccccccc-cccc-cccc-cccc-cccccccccccc','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SQL
contender=$!
sleep 0.5
if ! kill -0 "$contender" 2>/dev/null; then
  echo "Reassignment did not wait for the held parent task lock"; exit 1
fi
wait "$holder"
wait "$contender"
test "$(tail -n 1 "$ready_file")" = f || { echo "Reassignment succeeded despite worker lease"; exit 1; }
rm -f "$ready_file"
echo "Deterministic parent-lock race passed."
