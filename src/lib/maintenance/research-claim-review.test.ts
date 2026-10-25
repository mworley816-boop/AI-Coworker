import test from "node:test";
import assert from "node:assert/strict";
import {reviewResearchClaim} from "../tools/research-claim-review.ts";

test("unverified single-host claim requires manual review",()=>{
 const r=reviewResearchClaim({status:"unverified",independentHostCount:1,manufacturerDomainCandidateCount:0,effectiveEvidenceGroupCount:1,possibleDuplicateHostCount:0});
 assert.equal(r.manualReviewRequired,true);
 assert.equal(r.evidenceQualityScore,25);
 assert.deepEqual(r.reviewFlags,["no_configured_manufacturer_candidate","single_supporting_host","limited_distinct_note_evidence"]);
});
test("candidate manufacturer sources never automatically verify a claim",()=>{
 const r=reviewResearchClaim({status:"unverified",independentHostCount:3,manufacturerDomainCandidateCount:1,effectiveEvidenceGroupCount:3,possibleDuplicateHostCount:0});
 assert.equal(r.evidenceQualityScore,75);
 assert.equal(r.manualReviewRequired,true);
 assert.deepEqual(r.reviewFlags,[]);
});
test("conflicting claims are flagged and scores never go below zero",()=>{
 const r=reviewResearchClaim({status:"conflicting",independentHostCount:1,manufacturerDomainCandidateCount:0,effectiveEvidenceGroupCount:0,possibleDuplicateHostCount:0});
 assert.equal(r.evidenceQualityScore,0);
 assert.equal(r.evidenceQuality,"conflict_review");
 assert.ok(r.reviewFlags.includes("conflicting_note_placement"));
});
test("similar descriptions are flagged without asserting copying",()=>{
 const r=reviewResearchClaim({status:"unverified",independentHostCount:3,manufacturerDomainCandidateCount:0,effectiveEvidenceGroupCount:2,possibleDuplicateHostCount:1});
 assert.equal(r.evidenceQualityScore,40);
 assert.ok(r.reviewFlags.includes("possible_shared_note_descriptions"));
});
test("review score stays bounded at 100",()=>{
 const r=reviewResearchClaim({status:"unverified",independentHostCount:20,manufacturerDomainCandidateCount:20,effectiveEvidenceGroupCount:20,possibleDuplicateHostCount:0});
 assert.ok(r.evidenceQualityScore<=100);
 assert.equal(r.manualReviewRequired,true);
});

test("research review actions guide source investigation without approving claims",()=>{
 const r=reviewResearchClaim({status:"unverified",independentHostCount:1,manufacturerDomainCandidateCount:0,effectiveEvidenceGroupCount:1,possibleDuplicateHostCount:1});
 assert.equal(r.manualReviewRequired,true);
 assert.ok(r.reviewActions.some(action=>action.includes("official brand")));
 assert.ok(r.reviewActions.some(action=>action.includes("original publication")));
 assert.ok(r.reviewActions.some(action=>action.includes("additional distinct")));
});
test("even strong snippet evidence requires manual inspection",()=>{
 const r=reviewResearchClaim({status:"unverified",independentHostCount:3,manufacturerDomainCandidateCount:1,effectiveEvidenceGroupCount:3,possibleDuplicateHostCount:0});
 assert.deepEqual(r.reviewFlags,[]);
 assert.equal(r.manualReviewRequired,true);
 assert.match(r.reviewActions[0],/Manually inspect/);
});
