import assert from "node:assert/strict";
import {test} from "node:test";
import {canClaimPerfumeResearch,classifyResearchClaimResult} from "./scentmarked-perfume-claim-policy.ts";
test("only queued jobs with a source URL can be claimed",()=>{
 assert.equal(canClaimPerfumeResearch("queued","https://lattafa.com/p"),true);
 for(const status of ["researching","draft_ready","approved","held","failed"])assert.equal(canClaimPerfumeResearch(status,"https://lattafa.com/p"),false);
 assert.equal(canClaimPerfumeResearch("queued",null),false);
 assert.equal(canClaimPerfumeResearch("queued"," "),false);
});
test("distinguishes concurrent claims from database errors",()=>{
 assert.equal(classifyResearchClaimResult({error:false,claimed:true}),"claimed");
 assert.equal(classifyResearchClaimResult({error:false,claimed:false}),"already_claimed");
 assert.equal(classifyResearchClaimResult({error:true,claimed:false}),"claim_failed");
});
