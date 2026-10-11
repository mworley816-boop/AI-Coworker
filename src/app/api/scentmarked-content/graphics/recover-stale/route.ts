import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {runtimeEnv} from "@/lib/runtime-env";
import {holdStaleGraphicJobs} from "@/lib/scentmarked-graphic-job-recovery";
/** Explicit administrator recovery action; does not start generation. */
export async function POST(request:Request){
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({ok:false,status:"INVALID_ORIGIN"},{status:403});
 const session=await createServerSupabaseClient();
 if(!session)return NextResponse.json({ok:false,status:"WORKSPACE_NOT_CONFIGURED"},{status:503});
 const {data:{user}}=await session.auth.getUser();
 if(!user)return NextResponse.json({ok:false,status:"SIGN_IN_REQUIRED"},{status:401});
 const env=await runtimeEnv();
 const admins=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!user.email||!admins.includes(user.email.toLowerCase()))return NextResponse.json({ok:false,status:"ADMIN_REQUIRED"},{status:403});
 const service=await createServiceSupabaseClient();
 if(!service)return NextResponse.json({ok:false,status:"QUEUE_NOT_CONFIGURED"},{status:503});
 const result=await holdStaleGraphicJobs(service,30,10);
 return NextResponse.json(result,{status:result.ok?200:502,headers:{"cache-control":"no-store"}});
}
