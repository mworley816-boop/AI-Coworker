import assert from "node:assert/strict";
import {test} from "node:test";
import {planScheduledPerfumeResearch,type ScheduledResearchJob} from "./scentmarked-perfume-scheduled-planner.ts";
const job=(id:string,source_url:string|null,status="queued"):ScheduledResearchJob=>({id,house:"Lattafa",perfume_name:"Example",status,source_url,created_at:"2026-10-12T00:00:00Z"});
test("orders eligible queued jobs and limits the batch",()=>{
 const result=planScheduledPerfumeResearch([job("b","https://lattafa.com/b"),job("a","https://lattafa.com/a"),job("c","https://lattafa.com/c")],2);
 assert.deepEqual(result.ready.map(x=>x.id),["a","b"]);
 assert.deepEqual(result.skipped,[{id:"c",reason:"BATCH_LIMIT"}]);
});
test("skips missing or untrusted URLs without claiming jobs",()=>{
 const result=planScheduledPerfumeResearch([job("a",null),job("b","https://example.org/"),job("c","https://lattafa.com/c","approved")]);
 assert.deepEqual(result.ready,[]);
 assert.deepEqual(result.skipped.map(x=>x.reason),["SOURCE_URL_REQUIRED","UNLISTED_SOURCE","NOT_QUEUED"]);
});
test("enforces hard maximum and zero limit",()=>{
 const jobs=Array.from({length:8},(_,i)=>job(String(i),"https://lattafa.com/test"));
 assert.equal(planScheduledPerfumeResearch(jobs,100).ready.length,5);
 assert.equal(planScheduledPerfumeResearch(jobs,0).ready.length,0);
});
