import test from 'node:test';
import assert from 'node:assert/strict';
import { getFailedWorkflowJobs as getJobs } from './atlas-github-failed-jobs.mjs';
const base = { owner: 'sample', repo: 'site', runId: 123, token: 'private' };
test('returns only failed job and step metadata', async () => {
 const result = await getJobs({...base,fetchImpl:async()=>({ok:true,json:async()=>({jobs:[{id:1,name:'Build',conclusion:'failure',steps:[{number:2,name:'Compile',conclusion:'failure'},{number:1,name:'Setup',conclusion:'success'}],secret:'hidden'},{id:2,conclusion:'success'}]})})});
 assert.deepEqual(result,{ok:true,jobs:[{id:1,name:'Build',failed_steps:[{number:2,name:'Compile'}]}],truncated:false});
});
test('API error handled without token disclosure',async()=>assert.deepEqual(await getJobs({...base,fetchImpl:async()=>({ok:false,status:403})}),{ok:false,http_status:403,jobs:[]}));
test('rejects unsafe run ID',async()=>await assert.rejects(getJobs({...base,runId:-1}),TypeError));
test('rejects malformed response',async()=>await assert.rejects(getJobs({...base,fetchImpl:async()=>({ok:true,json:async()=>({})})}),TypeError));
