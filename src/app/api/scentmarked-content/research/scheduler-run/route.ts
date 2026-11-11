import {NextResponse} from "next/server";
import {runtimeEnv} from "@/lib/runtime-env";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {planScheduledPerfumeResearch,type ScheduledResearchJob} from "@/lib/scentmarked-perfume-scheduled-planner";
import {validateResearchWorkerSettings} from "@/lib/scentmarked-perfume-worker-safety";
import {researchPerfumeSource} from "@/lib/scentmarked-perfume-source-research";
/** Explicit opt-in private worker. Produces review drafts only; never publishes. */
export async function POST(request:Request){
 const env=await runtimeEnv();
 const secret=env.ATLAS_PERFUME_RESEARCH_CRON_SECRET;
 if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:"UNAUTHORIZED"},{status:401});
 const settings=validateResearchWorkerSettings({schedulerEnabled:env.ATLAS_PERFUME_RESEARCH_SCHEDULER_ENABLED==="true",workerEnabled:env.ATLAS_PERFUME_RESEARCH_WORKER_ENABLED==="true",batchSize:3});
 if(!settings.ok)return NextResponse.json({ok:false,error:settings.reason},{status:503});
 const service=await createServiceSupabaseClient();
 if(!service)return NextResponse.json({ok:false,error:"QUEUE_NOT_CONFIGURED"},{status:503});
 const {data,error}=await service.from("atlas_perfume_research_jobs").select("id,owner_user_id,house,perfume_name,status,source_url,created_at").eq("status","queued").not("source_url","is",null).order("created_at",{ascending:true}).limit(50);
 if(error)return NextResponse.json({ok:false,error:"QUEUE_LOOKUP_FAILED"},{status:502});
 const plan=planScheduledPerfumeResearch((data??[]) as ScheduledResearchJob[],settings.limit);
 const results:{id:string;status:string;reason?:string}[]=[];
 for(const job of plan.ready){
  const owner=(job as ScheduledResearchJob&{owner_user_id:string}).owner_user_id;
  const {data:claimed,error:claimError}=await service.from("atlas_perfume_research_jobs").update({status:"researching",updated_at:new Date().toISOString()}).eq("id",job.id).eq("owner_user_id",owner).eq("status","queued").eq("source_url",job.source_url!).select("id").maybeSingle();
  if(claimError||!claimed){results.push({id:job.id,status:claimError?"claim_failed":"already_claimed"});continue}
  try{
   const outcome=await researchPerfumeSource(job.house,job.perfume_name,job.source_url!);
   if(!outcome.ok){
    const {error:holdError}=await service.from("atlas_perfume_research_jobs").update({status:"held",error_code:outcome.reason,updated_at:new Date().toISOString()}).eq("id",job.id).eq("owner_user_id",owner).eq("status","researching");
    results.push({id:job.id,status:holdError?"hold_failed":"held",reason:outcome.reason});continue;
   }
   const candidate=outcome.candidate;
   const {data:saved,error:saveError}=await service.from("atlas_perfume_research_jobs").update({status:"draft_ready",source_url:candidate.sourceUrl,source_type:candidate.sourceType,draft_payload:candidate,error_code:null,updated_at:new Date().toISOString()}).eq("id",job.id).eq("owner_user_id",owner).eq("status","researching").select("id").maybeSingle();
   results.push({id:job.id,status:saveError?"save_failed":saved?"draft_ready":"job_changed"});
  }catch{
   const {error:holdError}=await service.from("atlas_perfume_research_jobs").update({status:"held",error_code:"RESEARCH_UNEXPECTED_ERROR",updated_at:new Date().toISOString()}).eq("id",job.id).eq("owner_user_id",owner).eq("status","researching");
   results.push({id:job.id,status:holdError?"hold_failed":"held",reason:"RESEARCH_UNEXPECTED_ERROR"});
  }
 }
 return NextResponse.json({ok:true,processed:results.length,results,skipped:plan.skipped},{headers:{"cache-control":"no-store"}});
}
