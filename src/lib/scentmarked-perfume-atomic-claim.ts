import {canClaimPerfumeResearch,classifyResearchClaimResult} from "./scentmarked-perfume-claim-policy";
export type ClaimableResearchJob={id:string;status:string;source_url:string|null;owner_user_id:string};
type ClaimQuery={eq:(column:string,value:string)=>ClaimQuery;select:(columns:string)=>ClaimQuery;maybeSingle:()=>PromiseLike<{data:{id:string}|null;error:{message:string}|null}>};
type ClaimTable={update:(values:{status:"researching";updated_at:string})=>ClaimQuery};
/** Atomic compare-and-set claim. Caller must authenticate and authorize owner. */
export async function claimPerfumeResearchJob(table:ClaimTable,job:ClaimableResearchJob,now=new Date()):Promise<"claimed"|"claim_failed"|"already_claimed"|"ineligible">{
 if(!canClaimPerfumeResearch(job.status,job.source_url))return "ineligible";
 const {data,error}=await table.update({status:"researching",updated_at:now.toISOString()})
  .eq("id",job.id).eq("owner_user_id",job.owner_user_id).eq("status","queued")
  .eq("source_url",job.source_url!).select("id").maybeSingle();
 return classifyResearchClaimResult({error:!!error,claimed:!!data});
}
