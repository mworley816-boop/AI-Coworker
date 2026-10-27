import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const workerSql=readFileSync("supabase/migrations/20261027010001_worker_parent_task_claim_lock.sql","utf8");
const guardSql=readFileSync("supabase/migrations/20261027010003_worker_reassignment_lease_guard.sql","utf8");

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

const manualSql=readFileSync("supabase/migrations/20261027010002_manual_claim_parent_task_lock.sql","utf8");

test("manual lease claims lock the parent task before changing a run lease",()=>{
  assert.match(manualSql,/from public\.tasks t where t\.id=v_task_id for update of t/);
  assert.ok(manualSql.indexOf("for update of t") < manualSql.indexOf("update public.runs r"));
  assert.match(manualSql,/r\.id=p_run_id and r\.task_id=v_task_id/);
  assert.match(manualSql,/grant execute on function public\.claim_run_lease\(uuid,text,integer\) to authenticated/);
});
