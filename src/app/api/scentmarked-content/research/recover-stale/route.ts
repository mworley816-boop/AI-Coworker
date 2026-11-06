import {NextResponse} from "next/server";
import {runtimeEnv} from "@/lib/runtime-env";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {holdStalePerfumeResearchJobs} from "@/lib/scentmarked-perfume-research-job-recovery";
/** Secret-authenticated maintenance only. Holds stale claims; never retries or publishes. */
export async function POST(request:Request){
 const env=await runtimeEnv();
 const secret=env.ATLAS_PERFUME_RESEARCH_CRON_SECRET;
 if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:"UNAUTHORIZED"},{status:401,headers:{"cache-control":"no-store"}});
 if(env.ATLAS_PERFUME_RESEARCH_SCHEDULER_ENABLED!=="true")return NextResponse.json({ok:false,error:"SCHEDULER_DISABLED"},{status:503,headers:{"cache-control":"no-store"}});
 const service=await createServiceSupabaseClient();
 if(!service)return NextResponse.json({ok:false,error:"QUEUE_NOT_CONFIGURED"},{status:503,headers:{"cache-control":"no-store"}});
 const result=await holdStalePerfumeResearchJobs(service,30,10);
 if(!result.ok)return NextResponse.json(result,{status:502,headers:{"cache-control":"no-store"}});
 return NextResponse.json(result,{headers:{"cache-control":"no-store"}});
}
