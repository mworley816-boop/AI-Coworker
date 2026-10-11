import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {runtimeEnv} from "@/lib/runtime-env";
import {processNextScentmarkedGraphicJob} from "@/lib/scentmarked-graphic-worker";

/** Manually invoked, admin-only worker endpoint. No scheduler is registered. */
export async function POST(){
 const session=await createServerSupabaseClient();
 if(!session)return NextResponse.json({ok:false,status:"WORKSPACE_NOT_CONFIGURED"},{status:503});
 const {data:{user}}=await session.auth.getUser();
 if(!user)return NextResponse.json({ok:false,status:"SIGN_IN_REQUIRED"},{status:401});
 const env=await runtimeEnv();
 const admins=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!user.email||!admins.includes(user.email.toLowerCase()))return NextResponse.json({ok:false,status:"ADMIN_REQUIRED"},{status:403});
 if(env.SCENTMARKED_GRAPHIC_WORKER_ENABLED!=="true")return NextResponse.json({ok:false,status:"WORKER_DISABLED"},{status:503});
 if(env.SCENTMARKED_IMAGE_GENERATION_ENABLED!=="true")return NextResponse.json({ok:false,status:"GRAPHIC_GENERATION_DISABLED"},{status:503});
 if(!env.OPENAI_API_KEY)return NextResponse.json({ok:false,status:"IMAGE_PROVIDER_NOT_CONFIGURED"},{status:503});
 const service=await createServiceSupabaseClient();
 if(!service)return NextResponse.json({ok:false,status:"QUEUE_NOT_CONFIGURED"},{status:503});
 const result=await processNextScentmarkedGraphicJob(service,{enabled:true,apiKey:env.OPENAI_API_KEY,model:env.SCENTMARKED_IMAGE_MODEL});
 return NextResponse.json({ok:result.ok,status:result.status,jobId:result.jobId??null},{status:result.ok?200:result.status==="QUEUE_EMPTY"?200:422,headers:{"cache-control":"no-store"}});
}
