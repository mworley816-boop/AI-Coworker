/** Pure guard for single-claim queue transitions; database must additionally CAS on status. */
export type ResearchClaimState="queued"|"researching"|"draft_ready"|"approved"|"held"|"failed";
export function canClaimPerfumeResearch(status:string,sourceUrl:string|null):boolean{
 return status==="queued"&&typeof sourceUrl==="string"&&sourceUrl.trim().length>0;
}
export function classifyResearchClaimResult(input:{error:boolean;claimed:boolean}):"claimed"|"claim_failed"|"already_claimed"{
 if(input.error)return "claim_failed";
 return input.claimed?"claimed":"already_claimed";
}
