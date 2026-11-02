import test from "node:test";
import assert from "node:assert/strict";
import {classifyDraftReviewReadiness} from "../research/draft-review-readiness.ts";

test("single-source manufacturer draft still requires independent verification",()=>{
  assert.deepEqual(classifyDraftReviewReadiness({sourceUrl:"https://example.org/item",sourceType:"manufacturer",notes:["vanilla"]}),{
    readiness:"needs_verification",manualReviewRequired:true,reasons:["independent_corroboration_not_recorded"]
  });
});
test("missing evidence cannot be marked ready",()=>{
  assert.equal(classifyDraftReviewReadiness(null).readiness,"missing_evidence");
  assert.equal(classifyDraftReviewReadiness({sourceUrl:"https://example.org/item",notes:[]}).readiness,"missing_evidence");
  assert.equal(classifyDraftReviewReadiness({sourceUrl:"invalid",notes:["vanilla"]}).readiness,"missing_evidence");
});

test("optional recorded sources are counted without automatic verification",()=>{
 const result=classifyDraftReviewReadiness({sourceUrl:"https://brand.example/item",sourceType:"manufacturer",notes:["vanilla"],evidenceSources:[{url:"https://brand.example/item",note:"vanilla"},{url:"https://retailer.example/item",note:"vanilla"}]});
 assert.equal(result.evidence?.distinctHostCount,2);
 assert.equal(result.readiness,"needs_verification");
 assert.equal(result.manualReviewRequired,true);
});
