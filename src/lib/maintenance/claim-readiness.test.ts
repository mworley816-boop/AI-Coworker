import test from "node:test";
import assert from "node:assert/strict";
import {classifyClaimReadiness,type ResearchClaim} from "../research/claim-readiness.ts";

const claim:ResearchClaim={value:"Vanilla",sourceUrl:"https://example.org/fragrance",sourceType:"brand",corroborated:true,conflicting:false};
test("corroborated sourced claim is ready for human review, not publication",()=>{
  assert.equal(classifyClaimReadiness(claim),"ready_for_review");
});
test("missing and invalid sources are blocked",()=>{
  for(const sourceUrl of [null,"","javascript:alert(1)","not-a-url"]){
    assert.equal(classifyClaimReadiness({...claim,sourceUrl}),"missing_evidence");
  }
});
test("unverified community or single-source claims need verification",()=>{
  assert.equal(classifyClaimReadiness({...claim,sourceType:"community"}),"needs_verification");
  assert.equal(classifyClaimReadiness({...claim,corroborated:false}),"needs_verification");
});
test("conflicting claims are blocked even with corroboration",()=>{
  assert.equal(classifyClaimReadiness({...claim,conflicting:true}),"conflicting");
});
