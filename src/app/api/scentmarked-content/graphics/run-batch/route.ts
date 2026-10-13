import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {runtimeEnv} from "@/lib/runtime-env";
import {processNextScentmarkedGraphicJob} from "@/lib/scentmarked-graphic-worker";
import {planGraphicBatch} from "@/lib/scentmarked-graphic-batch-policy";
import {ATLAS_GRAPHIC_ARTIFACT_BUCKET} from "@/lib/scentmarked-graphic-artifact-storage";
/** Administrator-triggered bounded batch. Never scheduled; never publishes. */
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
 if(Number(request.headers.get("content-length")??"0")>1024)return NextResponse.json({ok:false,status:"INVALID_REQUEST"},{status:413});
 let body:{requestedJobs?:unknown;confirm?:unknown};
 try{body=await request.json()}catch{return NextResponse.json({ok:false,status:"INVALID_REQUEST"},{status:400})}
 const service=await createServiceSupabaseClient();
 if(!service)return NextResponse.json({ok:false,status:"QUEUE_NOT_CONFIGURED"},{status:503});
 const {data:bucket,error:bucketError}=await service.storage.getBucket(ATLAS_GRAPHIC_ARTIFACT_BUCKET);
 const plan=planGraphicBatch({requestedJobs:typeof body.requestedJobs==="number"?body.requestedJobs:0,explicitlyAuthorized:body.confirm===true,workerEnabled:env.SCENTMARKED_GRAPHIC_WORKER_ENABLED==="true",generationEnabled:env.SCENTMARKED_IMAGE_GENERATION_ENABLED==="true",providerConfigured:Boolean(env.OPENAI_API_KEY),privateStorageReady:!bucketError&&bucket?.public===false});
 if(!plan.allowed)return NextResponse.json({ok:false,status:plan.reason},{status:422,headers:{"cache-control":"no-store"}});
 const results:{status:string;jobId:string|null}[]=[];
 for(let i=0;i<plan.maxJobs;i++){
  const result=await processNextScentmarkedGraphicJob(service,{enabled:true,apiKey:env.OPENAI_API_KEY!,model:env.SCENTMARKED_IMAGE_MODEL});
  results.push({status:result.status,jobId:result.jobId??null});
  if(!result.ok||result.status==="QUEUE_EMPTY")break;
 }
 return NextResponse.json({ok:true,status:"MANUAL_BATCH_FINISHED",attempted:results.length,results},{headers:{"cache-control":"no-store"}});
}
