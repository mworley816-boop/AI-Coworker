import test from "node:test";
import assert from "node:assert/strict";
import {planScheduledPerfumeResearch,type ScheduledResearchJob} from "../scentmarked-perfume-scheduled-planner.ts";
const job=(id:string,source_url:string|null,status="queued",created_at="2026-11-01T00:00:00Z"):ScheduledResearchJob=>({id,house:"Lattafa",perfume_name:"Sample",source_url,status,created_at});
test("scheduler selects only queued allowlisted HTTPS sources",()=>{
 const result=planScheduledPerfumeResearch([job("good","https://lattafa.com/sample"),job("bad","https://example.org/sample"),job("missing",null),job("done","https://lattafa.com/sample","draft_ready")],3);
 assert.deepEqual(result.ready.map(x=>x.id),["good"]);
 assert.deepEqual(result.skipped.map(x=>x.id),["bad","done","missing"]);
});
test("scheduler limits batches and orders deterministically",()=>{
 const jobs=[job("b","https://lattafa.com/b"),job("a","https://lattafa.com/a"),job("c","https://lattafa.com/c")];
 const result=planScheduledPerfumeResearch(jobs,1);
 assert.deepEqual(result.ready.map(x=>x.id),["a"]);
 assert.equal(result.skipped.filter(x=>x.reason==="BATCH_LIMIT").length,2);
 assert.equal(planScheduledPerfumeResearch(jobs,100).ready.length,3);
 assert.equal(planScheduledPerfumeResearch(jobs,0).ready.length,0);
});
