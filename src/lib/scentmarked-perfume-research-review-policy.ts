import type {PerfumeResearchCandidate} from "./scentmarked-perfume-research-policy";
/** Review decisions are local state changes only; never publish to Scentmarked. */
export function planPerfumeResearchReview(decision:unknown,job:{status:string;source_url:string|null;source_type:string|null;draft_payload:unknown}|null):
 {ok:true;update:{status:"approved"|"held";error_code:null|"REJECTED_BY_REVIEWER"}}|{ok:false;reason:string}{
 if(decision!=="approve"&&decision!=="reject")return {ok:false,reason:"INVALID_DECISION"};
 if(!job||job.status!=="draft_ready")return {ok:false,reason:"JOB_NOT_REVIEWABLE"};
 if(decision==="approve"){
  const draft=job.draft_payload as Partial<PerfumeResearchCandidate>|null;
  if(!draft||typeof draft!=="object"||typeof draft.sourceUrl!=="string"||draft.sourceUrl!==job.source_url||draft.sourceType!==job.source_type||!Array.isArray(draft.notes))return {ok:false,reason:"DRAFT_SOURCE_MISMATCH"};
 }
 return {ok:true,update:{status:decision==="approve"?"approved":"held",error_code:decision==="approve"?null:"REJECTED_BY_REVIEWER"}};
}
