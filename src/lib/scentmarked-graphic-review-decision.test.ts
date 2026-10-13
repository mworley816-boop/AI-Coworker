import assert from "node:assert/strict";
import {test} from "node:test";
import {planGraphicReviewUpdate} from "./scentmarked-graphic-review-decision.ts";
test("approval requires both explicit confirmations",()=>{
 for(const [identity,rights] of [[false,true],[true,false],[false,false],[undefined,true],[true,undefined],["true",true],[true,1]]){
  assert.deepEqual(planGraphicReviewUpdate("approve",identity,rights),{ok:false,error:"REVIEW_CONFIRMATION_REQUIRED"});
 }
 assert.deepEqual(planGraphicReviewUpdate("approve",true,true),{ok:true,update:{status:"approved",identity_verified:true,rights_cleared:true,error_code:null}});
});
test("rejection holds graphic and clears approvals without publishing",()=>{
 assert.deepEqual(planGraphicReviewUpdate("reject",true,true),{ok:true,update:{status:"held",identity_verified:false,rights_cleared:false,error_code:"REJECTED_BY_REVIEWER"}});
 assert.deepEqual(planGraphicReviewUpdate("publish",true,true),{ok:false,error:"INVALID_DECISION"});
});
