import assert from "node:assert/strict";
import {test} from "node:test";
import {planGraphicBatch} from "./scentmarked-graphic-batch-policy.ts";
const ready={requestedJobs:3,workerEnabled:true,generationEnabled:true,providerConfigured:true,privateStorageReady:true,explicitlyAuthorized:true};
test("batch processing requires explicit authorization",()=>assert.equal(planGraphicBatch({...ready,explicitlyAuthorized:false}).reason,"AUTHORIZATION_REQUIRED"));
test("generation must be enabled",()=>assert.equal(planGraphicBatch({...ready,generationEnabled:false}).allowed,false));
test("provider must be configured",()=>assert.equal(planGraphicBatch({...ready,providerConfigured:false}).allowed,false));
test("private storage must be ready",()=>assert.equal(planGraphicBatch({...ready,privateStorageReady:false}).allowed,false));
test("batch is limited to five jobs",()=>{assert.equal(planGraphicBatch({...ready,requestedJobs:6}).allowed,false);assert.equal(planGraphicBatch({...ready,requestedJobs:0}).allowed,false);assert.equal(planGraphicBatch({...ready,requestedJobs:5}).maxJobs,5)});
