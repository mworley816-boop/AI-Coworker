import {NextResponse} from "next/server";
import {runtimeEnv} from "@/lib/runtime-env";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {planScheduledPerfumeResearch,type ScheduledResearchJob} from "@/lib/scentmarked-perfume-scheduled-planner";
import {researchPerfumeSource} from "@/lib/scentmarked-perfume-source-research";
/** Opt-in private worker: claim at most one queued job and save a draft, never publish. */
export async function POST(request:Request){
 const env=await runtimeEnv();
 const secret=env.ATLAS_PERFUME_RESEARCH_CRON_SECRET;
 if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:"UNAUTHORIZED"},{status:401,headers:{"cache-control":"no-store"}});
 if(env.ATLAS_PERFUME_RESEARCH_SCHEDULER_ENABLED!=="true"||env.ATLAS_PERFUME_RESEARCH_EXECUTION_ENABLED!=="true")return NextResponse.json({ok:false,error:"EXECUTION_DISABLED"},{status:503});
 const service=await createServiceSupabaseClient();
 if(!service)return NextResponse.json({ok:false,error:"QUEUE_NOT_CONFIGURED"},{status:503});
 const {data,error}=await service.from("atlas_perfume_research_jobs").select("id,owner_user_id,house,perfume_name,status,source_url,created_at").eq("status","queued").not("source_url","is",null).order("created_at",{ascending:true}).limit(50);
 if(error)return NextResponse.json({ok:false,error:"QUEUE_LOOKUP_FAILED"},{status:502});
 const plan=planScheduledPerfumeResearch((data??[]) as ScheduledResearchJob[],1);
 for(const job of plan.ready){
  const owner=(data??[]).find(x=>x.id===job.id)?.owner_user_id;
  if(!owner||!job.source_url)continue;
  const {data:claimed,error:claimError}=await service.from("atlas_perfume_research_jobs").update({status:"researching",updated_at:new Date().toISOString()}).eq("id",job.id).eq("owner_user_id",owner).eq("status","queued").select("id").maybeSingle();
  if(claimError)return NextResponse.json({ok:false,error:"JOB_CLAIM_FAILED"},{status:502});
  if(!claimed)continue;
  let result:Awaited<ReturnType<typeof researchPerfumeSource>>;
  try{result=await researchPerfumeSource(job.house,job.perfume_name,job.source_url)}
  catch{result={ok:false,reason:"RESEARCH_UNEXPECTED_ERROR"}}
  if(!result.ok){
   const {error:holdError}=await service.from("atlas_perfume_research_jobs").update({status:"held",error_code:result.reason,updated_at:new Date().toISOString()}).eq("id",job.id).eq("owner_user_id",owner).eq("status","researching");
   if(holdError)return NextResponse.json({ok:false,error:"JOB_HOLD_FAILED",jobId:job.id},{status:502});
   return NextResponse.json({ok:true,executed:1,jobId:job.id,status:"held",reason:result.reason},{headers:{"cache-control":"no-store"}});
  }
  const candidate=result.candidate;
  const {data:saved,error:saveError}=await service.from("atlas_perfume_research_jobs").update({status:"draft_ready",source_url:candidate.sourceUrl,source_type:candidate.sourceType,draft_payload:candidate,error_code:null,updated_at:new Date().toISOString()}).eq("id",job.id).eq("owner_user_id",owner).eq("status","researching").select("id").maybeSingle();
  if(saveError)return NextResponse.json({ok:false,error:"DRAFT_SAVE_FAILED",jobId:job.id},{status:502});
  if(!saved)return NextResponse.json({ok:false,error:"JOB_CHANGED",jobId:job.id},{status:409});
  return NextResponse.json({ok:true,executed:1,jobId:job.id,status:"draft_ready",manualReviewRequired:true,published:false},{headers:{"cache-control":"no-store"}});
 }
 return NextResponse.json({ok:true,executed:0,skipped:plan.skipped.length},{headers:{"cache-control":"no-store"}});
}
