import test from "node:test";
import assert from "node:assert/strict";
import {classifyWorkerOutcome} from "../execution/worker-outcome.ts";

test("counts confirmed completion only",()=>{
  assert.equal(classifyWorkerOutcome({ok:true,result:{status:"completed"}}),"completed");
});
test("does not count approval waits, pauses or cancellation as completion",()=>{
  for(const status of ["waiting_approval","paused","cancelled","running"]){
    assert.equal(classifyWorkerOutcome({ok:true,result:{status}}),"deferred");
  }
  assert.equal(classifyWorkerOutcome({ok:true}),"deferred");
});
test("failed runs are failures even if a status field claims completion",()=>{
  assert.equal(classifyWorkerOutcome({ok:false,result:{status:"completed"}}),"failed");
});

test("only exact completed status is counted as success",()=>{
  for(const status of ["completed_with_warnings","failed","queued","retrying","waiting",""]){
    assert.equal(classifyWorkerOutcome({ok:true,result:{status}}),"deferred");
  }
});
test("failed outcomes take precedence over any lifecycle state",()=>{
  for(const status of ["completed","running","waiting_approval","cancelled"]){
    assert.equal(classifyWorkerOutcome({ok:false,result:{status}}),"failed");
  }
});
