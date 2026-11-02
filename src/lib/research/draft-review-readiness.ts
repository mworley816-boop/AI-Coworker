import {classifyClaimReadiness,type ClaimReadiness} from "./claim-readiness.ts";
import {summarizeSourceCorroboration,type ResearchSource} from "./source-corroboration.ts";
import type {PerfumeResearchCandidate} from "../scentmarked-perfume-research-policy.ts";

/** Advisory classification of a saved research draft; never authorizes publishing. */
export function classifyDraftReviewReadiness(draft:(Partial<PerfumeResearchCandidate>&{evidenceSources?:ResearchSource[]})|null|undefined):{
  readiness:ClaimReadiness;
  manualReviewRequired:true;
  reasons:string[];
  evidence?:ReturnType<typeof summarizeSourceCorroboration>;
}{
  if(!draft||typeof draft.sourceUrl!=="string"||!Array.isArray(draft.notes))
    return {readiness:"missing_evidence",manualReviewRequired:true,reasons:["missing_draft_or_source"]};
  const notes=draft.notes.filter((n):n is string=>typeof n==="string"&&!!n.trim());
  if(!notes.length)return {readiness:"missing_evidence",manualReviewRequired:true,reasons:["no_research_notes"]};
  // A single saved source cannot demonstrate independent corroboration.
  const readiness=classifyClaimReadiness({
    value:notes.join(", "),
    sourceUrl:draft.sourceUrl,
    sourceType:draft.sourceType==="manufacturer"?"brand":draft.sourceType==="retailer"?"retailer":"community",
    corroborated:false,
    conflicting:false
  });
  const evidence=Array.isArray(draft.evidenceSources)?summarizeSourceCorroboration(draft.evidenceSources.filter((s):s is ResearchSource=>!!s&&typeof s.url==="string"&&typeof s.note==="string")):undefined;
  return {readiness,manualReviewRequired:true,reasons:readiness==="missing_evidence"?["missing_usable_source"]:["independent_corroboration_not_recorded"],...(evidence?{evidence}:{})};
}
