import test from 'node:test';
import assert from 'node:assert/strict';
import { attachScheduledWorkflowIncidentSync } from './atlas-scheduled-workflow-incidents.mjs';
const base={owner:'sample',repo:'site',token:'secret'};
test('preserves existing scheduled handler and records incidents',async()=>{
 const saved=[];let called=0;
 const wrapped=attachScheduledWorkflowIncidentSync(async()=>{called++;return 'existing';},{...base,repository:{record:async i=>saved.push(i)},fetchImpl:async url=>String(url).includes('/jobs?')?{ok:true,json:async()=>({jobs:[]})}:{ok:true,json:async()=>({workflow_runs:[{id:17,name:'CI',conclusion:'failure'}]})}});
 assert.equal(await wrapped({}, {}, {}),'existing');assert.equal(called,1);assert.equal(saved.length,1);
});
test('provider outage does not block existing work',async()=>{
 const errors=[];
 const wrapped=attachScheduledWorkflowIncidentSync(async()=>42,{...base,repository:{record:async()=>{}},fetchImpl:async()=>({ok:false,status:403})},{onError:e=>errors.push(e)});
 assert.equal(await wrapped({}, {}, {}),42);assert.equal(errors[0].reason,'provider_unavailable');
});
test('existing handler rejection remains visible',async()=>{
 const wrapped=attachScheduledWorkflowIncidentSync(async()=>{throw Error('existing failed')},{...base,repository:{record:async()=>{}},fetchImpl:async()=>({ok:true,json:async()=>({workflow_runs:[]})})});
 await assert.rejects(wrapped({}, {}, {}),/existing failed/);
});
