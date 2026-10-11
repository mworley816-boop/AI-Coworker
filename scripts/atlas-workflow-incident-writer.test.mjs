import test from 'node:test';
import assert from 'node:assert/strict';
import { recordWorkflowDiagnostics as persist } from './atlas-workflow-incident-writer.mjs';
test('records sanitized incident with approval required',async()=>{
 const saved=[];
 const result=await persist({report:{ok:true,incidents:[{run_id:123,workflow:'CI',diagnostic_complete:true,failed_jobs:[{id:4,name:'Build',failed_steps:[{number:2,name:'Compile'}]}]}]},repository:{record:async i=>saved.push(i)}});
 assert.equal(result.recorded_count,1);
 assert.equal(saved[0].fingerprint,'github-actions:run:123');
 assert.equal(saved[0].approval_required,true);
 assert.equal(saved[0].observed_evidence.failed_jobs[0].failed_steps[0].name,'Compile');
});
test('rejects unsuccessful reports',async()=>await assert.rejects(persist({report:{ok:false,incidents:[]},repository:{record:async()=>{}}}),TypeError));
test('requires repository',async()=>await assert.rejects(persist({report:{ok:true,incidents:[]}}),TypeError));
test('skips invalid run identifiers',async()=>assert.equal((await persist({report:{ok:true,incidents:[{run_id:-1}]},repository:{record:async()=>{throw Error('unexpected')}}})).recorded_count,0));
