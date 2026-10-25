/** Pure validation for snippet-derived research claims. Never grants factual verification. */
export type ResearchClaimReview={status:string;independentHostCount:number;manufacturerDomainCandidateCount:number;effectiveEvidenceGroupCount:number;possibleDuplicateHostCount:number};
export function reviewResearchClaim(claim:ResearchClaimReview){
 const flags:string[]=[];
 if(claim.status==="conflicting")flags.push("conflicting_note_placement");
 if(claim.manufacturerDomainCandidateCount===0)flags.push("no_configured_manufacturer_candidate");
 if(claim.possibleDuplicateHostCount>0)flags.push("possible_shared_note_descriptions");
 if(claim.independentHostCount<2)flags.push("single_supporting_host");
 if(claim.effectiveEvidenceGroupCount<2)flags.push("limited_distinct_note_evidence");
 const score=Math.max(0,Math.min(100,25+Math.min(30,Math.max(0,claim.effectiveEvidenceGroupCount-1)*15)+Math.min(20,claim.manufacturerDomainCandidateCount*20)-(claim.status==="conflicting"?35:0)));
 const evidenceQuality=claim.status==="conflicting"?"conflict_review":score>=60?"higher_review_priority":score>=40?"moderate_review_priority":"limited_evidence";
 return {reviewFlags:flags,manualReviewRequired:true,evidenceQualityScore:score,evidenceQuality};
}
