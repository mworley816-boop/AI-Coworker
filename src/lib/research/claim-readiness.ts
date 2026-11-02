/** Conservative publication gate for researched fragrance facts. */
export type ResearchClaim={
  value:string;
  sourceUrl:string|null;
  sourceType:"brand"|"retailer"|"community"|"unknown";
  corroborated:boolean;
  conflicting:boolean;
};
export type ClaimReadiness="ready_for_review"|"needs_verification"|"conflicting"|"missing_evidence";
export function classifyClaimReadiness(claim:ResearchClaim):ClaimReadiness{
  if(claim.conflicting)return "conflicting";
  if(!claim.value.trim()||!claim.sourceUrl?.trim())return "missing_evidence";
  let url:URL;
  try{url=new URL(claim.sourceUrl);}catch{return "missing_evidence";}
  if(!["https:","http:"].includes(url.protocol)||!url.hostname)return "missing_evidence";
  if(claim.sourceType==="unknown"||claim.sourceType==="community")return "needs_verification";
  if(!claim.corroborated)return "needs_verification";
  return "ready_for_review";
}
