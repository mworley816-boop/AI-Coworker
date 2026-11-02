import test from "node:test";
import assert from "node:assert/strict";
import {workerAdmission} from "../execution/worker-admission.ts";

const configured={
  secret:"offline-test-secret",
  serviceRoleKey:"offline-placeholder",
  url:"https://example.invalid",
  authorization:"Bearer offline-test-secret",
  maintenanceFlag:undefined as string|undefined
};

test("unconfigured worker returns 503 before auth or database access",()=>{
  assert.deepEqual(workerAdmission({...configured,serviceRoleKey:undefined}),{
    status:503,body:{ok:false,reason:"Worker is not configured"}
  });
});

test("unauthorized worker returns 401 even when maintenance enabled",()=>{
  assert.deepEqual(workerAdmission({...configured,authorization:null,maintenanceFlag:"true"}),{
    status:401,body:{ok:false,reason:"Unauthorized"}
  });
});

test("authorized paused worker returns HTTP 200 and zero processed jobs",()=>{
  assert.deepEqual(workerAdmission({...configured,maintenanceFlag:"true"}),{
    status:200,body:{ok:true,paused:true,processed:0,failed:0,reason:"Worker maintenance mode is enabled"}
  });
});

test("normal mode permits request to proceed to batch processing",()=>{
  assert.equal(workerAdmission(configured),null);
  assert.equal(workerAdmission({...configured,maintenanceFlag:"false"}),null);
});
