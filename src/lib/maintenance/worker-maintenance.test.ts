import test from "node:test";
import assert from "node:assert/strict";
import {isWorkerMaintenanceEnabled} from "../execution/worker-maintenance.ts";

test("maintenance mode admits normal worker batches by default",()=>{
  for(const value of [undefined,"","false","FALSE","0","True"," true "]){
    assert.equal(isWorkerMaintenanceEnabled(value),false);
  }
});

test("maintenance mode blocks new worker batches only on explicit true",()=>{
  assert.equal(isWorkerMaintenanceEnabled("true"),true);
});

test("offline pause and resume simulation never invokes the batch callback",async()=>{
  let batches=0;
  const simulate=async(flag:string|undefined)=>{
    if(isWorkerMaintenanceEnabled(flag))return {paused:true,processed:0,failed:0};
    batches++;
    return {paused:false,processed:1,failed:0};
  };
  assert.deepEqual(await simulate("true"),{paused:true,processed:0,failed:0});
  assert.equal(batches,0,"paused request must not invoke batch processing");
  assert.deepEqual(await simulate(undefined),{paused:false,processed:1,failed:0});
  assert.equal(batches,1,"resumed request invokes batch processing");
});
