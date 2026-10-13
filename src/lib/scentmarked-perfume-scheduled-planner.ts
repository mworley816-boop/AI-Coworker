import {planPerfumeSourceRetrieval} from "./scentmarked-perfume-source-retrieval-policy";
export type ScheduledResearchJob={id:string;house:string;perfume_name:string;status:string;source_url:string|null;created_at:string};
export type ScheduledResearchPlan={ready:ScheduledResearchJob[];skipped:{id:string;reason:string}[]};
/** Pure planning stage. No network access, job claims, or publishing. */
export function planScheduledPerfumeResearch(jobs:readonly ScheduledResearchJob[],limit=3):ScheduledResearchPlan{
 const ready:ScheduledResearchJob[]=[];
 const skipped:{id:string;reason:string}[]=[];
 const max=Math.min(5,Math.max(0,Math.floor(Number.isFinite(limit)?limit:0)));
 const ordered=[...jobs].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));
 for(const job of ordered){
  if(job.status!=="queued"){skipped.push({id:job.id,reason:"NOT_QUEUED"});continue}
  if(!job.source_url){skipped.push({id:job.id,reason:"SOURCE_URL_REQUIRED"});continue}
  const source=planPerfumeSourceRetrieval(job.house,job.source_url);
  if(!source.ok){skipped.push({id:job.id,reason:source.reason});continue}
  if(ready.length>=max){skipped.push({id:job.id,reason:"BATCH_LIMIT"});continue}
  ready.push(job);
 }
 return {ready,skipped};
}
