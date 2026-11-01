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
