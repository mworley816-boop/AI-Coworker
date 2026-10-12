import {NextResponse} from "next/server";
import {runtimeEnv} from "@/lib/runtime-env";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {planScheduledPerfumeResearch,type ScheduledResearchJob} from "@/lib/scentmarked-perfume-scheduled-planner";
/** Private, read-only scheduler preview. No job claims, fetching or publishing. */
export async function POST(request:Request){
 const env=await runtimeEnv();
 const expected=env.ATLAS_PERFUME_RESEARCH_CRON_SECRET;
 const supplied=request.headers.get("authorization");
 if(!expected||!supplied||supplied!==`Bearer ${expected}`)return NextResponse.json({ok:false,error:"UNAUTHORIZED"},{status:401,headers:{"cache-control":"no-store"}});
 if(env.ATLAS_PERFUME_RESEARCH_SCHEDULER_ENABLED!=="true")return NextResponse.json({ok:false,error:"SCHEDULER_DISABLED"},{status:503});
 const service=await createServiceSupabaseClient();
 if(!service)return NextResponse.json({ok:false,error:"QUEUE_NOT_CONFIGURED"},{status:503});
 const {data,error}=await service.from("atlas_perfume_research_jobs").select("id,house,perfume_name,status,source_url,created_at").eq("status","queued").not("source_url","is",null).order("created_at",{ascending:true}).limit(50);
 if(error)return NextResponse.json({ok:false,error:"QUEUE_LOOKUP_FAILED"},{status:502});
 const plan=planScheduledPerfumeResearch((data??[]) as ScheduledResearchJob[],3);
 return NextResponse.json({ok:true,mode:"preview",selected:plan.ready.map(x=>({id:x.id,house:x.house,name:x.perfume_name})),skipped:plan.skipped,executed:0},{headers:{"cache-control":"no-store"}});
}
