/** Pure validation for snippet-derived research claims. Never grants factual verification. */
export type ResearchClaimReview={status:string;independentHostCount:number;manufacturerDomainCandidateCount:number;effectiveEvidenceGroupCount:number;possibleDuplicateHostCount:number};
export function reviewResearchClaim(claim:ResearchClaimReview){
 const flags:string[]=[];
 if(claim.status==="conflicting")flags.push("conflicting_note_placement");
 if(claim.manufacturerDomainCandidateCount===0)flags.push("no_configured_manufacturer_candidate");
 if(claim.possibleDuplicateHostCount>0)flags.push("possible_shared_note_descriptions");
 if(claim.independentHostCount<2)flags.push("single_supporting_host");
 if(claim.effectiveEvidenceGroupCount<2)flags.push("limited_distinct_note_evidence");
 // Human-readable next actions are derived only from review flags.
 const reviewActions:string[]=[];
 if(flags.includes("conflicting_note_placement"))reviewActions.push("Compare the original note pyramids and resolve placement differences.");
 if(flags.includes("no_configured_manufacturer_candidate"))reviewActions.push("Find an official brand or manufacturer product page and check its authorship.");
 if(flags.includes("possible_shared_note_descriptions"))reviewActions.push("Trace repeated descriptions to their original publication before treating them as independent.");
 if(flags.includes("single_supporting_host"))reviewActions.push("Locate an additional distinct source host for comparison.");
 if(flags.includes("limited_distinct_note_evidence"))reviewActions.push("Review original pages and collect independently authored evidence.");
 if(reviewActions.length===0)reviewActions.push("Manually inspect cited original pages before approving any fragrance-note claim.");
 // Triage urgency is separate from evidence-quality score and never implies truth.
 const reviewUrgency=claim.status==="conflicting"?"high":claim.possibleDuplicateHostCount>0||claim.independentHostCount<2?"medium":"routine";
 const reviewUrgencyReason=claim.status==="conflicting"
  ?"Potentially conflicting note placements require manual resolution."
  :claim.possibleDuplicateHostCount>0?"Descriptions may share an upstream source; investigate provenance."
  :claim.independentHostCount<2?"Only one supporting source host was identified."
  :"No elevated triage trigger was found; manual source verification is still required.";
 const score=Math.max(0,Math.min(100,25+Math.min(30,Math.max(0,claim.effectiveEvidenceGroupCount-1)*15)+Math.min(20,claim.manufacturerDomainCandidateCount*20)-(claim.status==="conflicting"?35:0)));
 const evidenceQuality=claim.status==="conflicting"?"conflict_review":score>=60?"higher_review_priority":score>=40?"moderate_review_priority":"limited_evidence";
 return {reviewFlags:flags,reviewActions,reviewUrgency,reviewUrgencyReason,manualReviewRequired:true,evidenceQualityScore:score,evidenceQuality};
}

/** Deterministic ordering for manual review queues. Does not change claim status. */
export function rankResearchClaimsForReview<T extends ResearchClaimReview>(claims:readonly T[]):Array<{claim:T;review:ReturnType<typeof reviewResearchClaim>;originalIndex:number}>{
 const urgencyRank:Record<string,number>={high:0,medium:1,routine:2};
 return claims.map((claim,originalIndex)=>({claim,review:reviewResearchClaim(claim),originalIndex}))
  .sort((a,b)=>urgencyRank[a.review.reviewUrgency]-urgencyRank[b.review.reviewUrgency]
   ||a.review.evidenceQualityScore-b.review.evidenceQualityScore
   ||a.originalIndex-b.originalIndex);
}
