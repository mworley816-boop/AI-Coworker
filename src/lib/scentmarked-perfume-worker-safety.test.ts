import assert from "node:assert/strict";
import {test} from "node:test";
import {validateResearchWorkerSettings} from "./scentmarked-perfume-worker-safety.ts";
test("requires both independent worker enable flags",()=>{
 assert.deepEqual(validateResearchWorkerSettings({schedulerEnabled:true,workerEnabled:false,batchSize:3}),{ok:false,reason:"WORKER_DISABLED"});
 assert.deepEqual(validateResearchWorkerSettings({schedulerEnabled:false,workerEnabled:true,batchSize:3}),{ok:false,reason:"WORKER_DISABLED"});
});
test("rejects invalid and oversized batches",()=>{
 for(const size of [0,-1,6,1.5,Number.NaN])assert.deepEqual(validateResearchWorkerSettings({schedulerEnabled:true,workerEnabled:true,batchSize:size}),{ok:false,reason:"INVALID_BATCH_SIZE"});
 assert.deepEqual(validateResearchWorkerSettings({schedulerEnabled:true,workerEnabled:true,batchSize:3}),{ok:true,limit:3});
});
