import test from 'node:test';
import assert from 'node:assert/strict';
import { runWorkflowIncidentSync as sync } from './atlas-workflow-incident-sync.mjs';
const base={owner:'sample',repo:'site',token:'secret'};
test('discovers and records failed workflow',async()=>{
 const records=[];
 const result=await sync({...base,repository:{record:async i=>records.push(i)},fetchImpl:async url=>String(url).includes('/jobs?')?{ok:true,json:async()=>({jobs:[{id:3,name:'Build',conclusion:'failure'}]})}:{ok:true,json:async()=>({workflow_runs:[{id:5,name:'CI',conclusion:'failure'}]})}});
 assert.equal(result.recorded_count,1);assert.equal(records[0].fingerprint,'github-actions:run:5');
});
test('does not write if discovery fails',async()=>{
 let writes=0;
 const result=await sync({...base,repository:{record:async()=>writes++},fetchImpl:async()=>({ok:false,status:403})});
 assert.equal(result.ok,false);assert.equal(writes,0);
});
