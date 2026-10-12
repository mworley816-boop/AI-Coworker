import assert from "node:assert/strict";
import {test} from "node:test";
import {planPerfumeResearchReview} from "./scentmarked-perfume-research-review-policy.ts";
const draft={status:"draft_ready",source_url:"https://example.com/p",source_type:"manufacturer",draft_payload:{sourceUrl:"https://example.com/p",sourceType:"manufacturer",notes:["vanilla"]}};
test("approval requires source-consistent draft",()=>{
 assert.deepEqual(planPerfumeResearchReview("approve",draft),{ok:true,update:{status:"approved",error_code:null}});
 assert.equal(planPerfumeResearchReview("approve",{...draft,source_url:"https://other.example/p"}).ok,false);
 assert.equal(planPerfumeResearchReview("approve",{...draft,draft_payload:null}).ok,false);
});
test("reject is a hold; non-reviewable jobs fail closed",()=>{
 assert.deepEqual(planPerfumeResearchReview("reject",draft),{ok:true,update:{status:"held",error_code:"REJECTED_BY_REVIEWER"}});
 assert.equal(planPerfumeResearchReview("approve",{...draft,status:"queued"}).ok,false);
 assert.equal(planPerfumeResearchReview("publish",draft).ok,false);
});
