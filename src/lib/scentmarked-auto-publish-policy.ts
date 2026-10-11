/** Fail-closed policy for future Scentmarked catalog and media automation. */
export type PublishCandidate={
 sourceVerified:boolean; duplicateReviewPassed:boolean; catalogConnectionReady:boolean;
 authorizedForAutopublish:boolean; conflictingExistingData:boolean;
 image?:{rightsCleared:boolean;identityVerified:boolean;storageReady:boolean};
};
export type PublishDecision={eligible:boolean;reasons:string[]};
/** Eligibility is not execution: a separate authenticated publishing service must enforce this decision. */
export function evaluateAutoPublish(candidate:PublishCandidate):PublishDecision{
 const reasons:string[]=[];
 if(!candidate.authorizedForAutopublish)reasons.push("AUTO_PUBLISH_NOT_AUTHORIZED");
 if(!candidate.catalogConnectionReady)reasons.push("CATALOG_CONNECTION_NOT_READY");
 if(!candidate.sourceVerified)reasons.push("SOURCE_NOT_VERIFIED");
 if(!candidate.duplicateReviewPassed)reasons.push("DUPLICATE_REVIEW_INCOMPLETE");
 if(candidate.conflictingExistingData)reasons.push("CONFLICTING_EXISTING_DATA");
 if(candidate.image){
  if(!candidate.image.rightsCleared)reasons.push("IMAGE_RIGHTS_UNVERIFIED");
  if(!candidate.image.identityVerified)reasons.push("IMAGE_IDENTITY_UNVERIFIED");
  if(!candidate.image.storageReady)reasons.push("MEDIA_STORAGE_NOT_READY");
 }
 return {eligible:reasons.length===0,reasons};
}
