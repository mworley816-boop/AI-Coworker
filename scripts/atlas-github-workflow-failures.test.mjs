import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverFailedWorkflowRuns as discover } from './atlas-github-workflow-failures.mjs';
const args={owner:'example',repo:'project',token:'secret'};
test('lists failed runs without exposing credentials',async()=>{
 let url,headers;
 const result=await discover({...args,fetchImpl:async(u,o)=>{url=String(u);headers=o.headers;return {ok:true,json:async()=>({workflow_runs:[{id:42,name:'Build',conclusion:'failure',html_url:'https://github.com/example/project/actions/runs/42'},{id:43,conclusion:'success'}]})};}});
 assert.equal(result.runs.length,1);assert.equal(result.runs[0].diagnosis.approval_required,true);
 assert.equal(url.includes('secret'),false);assert.equal(headers.Authorization,'Bearer secret');
});
test('handles provider errors',async()=>assert.deepEqual(await discover({...args,fetchImpl:async()=>({ok:false,status:401})}),{ok:false,http_status:401,runs:[]}));
test('rejects invalid repository',async()=>await assert.rejects(discover({...args,owner:'../bad'}),TypeError));
test('rejects absent token',async()=>await assert.rejects(discover({...args,token:''}),TypeError));
test('rejects malformed payload',async()=>await assert.rejects(discover({...args,fetchImpl:async()=>({ok:true,json:async()=>({})})}),TypeError));
