import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const root = new URL("../migrations/", import.meta.url);
const sql = (name) => readFileSync(new URL(name, root), "utf8");
const automatic = sql("20261027010001_worker_parent_task_claim_lock.sql");
const manual = sql("20261027010002_manual_claim_parent_task_lock.sql");
const reassignment = sql("20261027010003_worker_reassignment_lease_guard.sql");

test("automatic claim locks task before run and skips locked rows", () => {
  assert.match(automatic, /for update of t skip locked/i);
  assert.match(automatic, /for update of r skip locked/i);
  assert.ok(automatic.indexOf("for update of t skip locked") < automatic.indexOf("for update of r skip locked"));
  assert.match(automatic, /r\.lease_expires_at\s*<=\s*now\(\)/i);
  assert.match(automatic, /r\.lease_owner\s*=\s*p_owner/i);
});

test("manual claim acquires task lock before changing run lease", () => {
  assert.match(manual, /for update of t/i);
  assert.ok(manual.indexOf("for update of t") < manual.indexOf("update public.runs"));
  assert.match(manual, /r\.lease_expires_at\s*<=\s*now\(\)/i);
  assert.match(manual, /r\.lease_owner\s*=\s*p_owner/i);
});

test("reassignment requires owner and rejects active leases", () => {
  assert.match(reassignment, /auth\.uid\(\) is null/i);
  assert.match(reassignment, /user_id\s*=\s*auth\.uid\(\)/i);
  assert.match(reassignment, /for update/i);
  assert.match(reassignment, /lease_owner is not null and lease_expires_at > now\(\)/i);
  assert.match(reassignment, /status\s*<>\s*'queued'/i);
});

test("worker claim is not granted to anon or authenticated", () => {
  assert.match(automatic, /revoke execute on function public\.claim_next_queued_run\(text,integer\) from public,anon,authenticated/i);
  assert.match(automatic, /grant execute on function public\.claim_next_queued_run\(text,integer\) to service_role/i);
});

test("manual claim explicitly grants authenticated execution", () => {
  assert.match(manual, /grant execute on function public\.claim_run_lease\(uuid,text,integer\) to authenticated/i);
});
