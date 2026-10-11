import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseRecentWorkflowFailures as diagnose } from './atlas-workflow-diagnostics.mjs';
const base = {owner:'sample',repo:'site',token:'secret'};
test('joins failed runs with failed jobs',async()=>{
 const result=await diagnose({...base,fetchImpl:async(url)=>{
 const path=String(url);
 if(path.includes('/jobs?'))return {ok:true,json:async()=>({jobs:[{id:22,name:'Build',conclusion:'failure',steps:[{number:3,name:'Compile',conclusion:'failure'}]}]})};
 return {ok:true,json:async()=>({workflow_runs:[{id:11,name:'CI',conclusion:'failure',created_at:'2026-10-11T00:00:00Z',html_url:'https://github.com/sample/site/actions/runs/11'}]})};
 }});
 assert.equal(result.incidents.length,1);assert.equal(result.incidents[0].failed_jobs[0].failed_steps[0].name,'Compile');
 assert.equal(result.incidents[0].approval_required,true);
});
test('handles GitHub API errors',async()=>assert.deepEqual(await diagnose({...base,fetchImpl:async()=>({ok:false,status:401})}),{ok:false,stage:'runs',http_status:401,incidents:[]}));
test('rejects excessive runs',async()=>await assert.rejects(diagnose({...base,maxRuns:200}),RangeError));
test('job details unavailable remains explicit',async()=>{
 const result=await diagnose({...base,fetchImpl:async(url)=>String(url).includes('/jobs?')?{ok:false,status:403}:{ok:true,json:async()=>({workflow_runs:[{id:11,name:'CI',conclusion:'failure'}]})}});
 assert.equal(result.incidents[0].diagnostic_complete,false);
});
