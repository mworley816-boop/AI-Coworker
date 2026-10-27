import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const workerSql=readFileSync("supabase/migrations/20261026_worker_parent_task_claim_lock.sql","utf8");
const guardSql=readFileSync("supabase/migrations/20261026_worker_reassignment_lease_guard.sql","utf8");

test("worker claims lock the task before the run",()=>{
  const taskLock=workerSql.indexOf("for update of t skip locked");
  const runLock=workerSql.indexOf("for update of r skip locked");
  assert.ok(taskLock>=0,"parent task row must be locked");
  assert.ok(runLock>taskLock,"run row lock must follow task lock");
  assert.match(workerSql,/where r\.id=v_run_id and r\.status='queued'/);
});

test("worker claim RPC remains restricted to service_role",()=>{
  assert.match(workerSql,/revoke execute on function public\.claim_next_queued_run\(text,integer\) from public,anon,authenticated/);
  assert.match(workerSql,/grant execute on function public\.claim_next_queued_run\(text,integer\) to service_role/);
});

test("reassignment rejects active worker leases",()=>{
  assert.match(guardSql,/lease_owner is not null and lease_expires_at > now\(\)/);
  assert.match(guardSql,/for update/);
  assert.match(guardSql,/auth\.uid\(\)/);
});
