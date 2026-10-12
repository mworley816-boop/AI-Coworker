import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {runtimeEnv} from "@/lib/runtime-env";
import {researchPerfumeSource} from "@/lib/scentmarked-perfume-source-research";
import {planPerfumeSourceRetrieval} from "@/lib/scentmarked-perfume-source-retrieval-policy";
/** Explicit, admin-triggered single-job research. Never publishes. */
export async function POST(request:Request){
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({ok:false,error:"INVALID_ORIGIN"},{status:403});
 const session=await createServerSupabaseClient();
 if(!session)return NextResponse.json({ok:false,error:"WORKSPACE_NOT_CONFIGURED"},{status:503});
 const {data:{user}}=await session.auth.getUser();
 if(!user)return NextResponse.json({ok:false,error:"SIGN_IN_REQUIRED"},{status:401});
 const env=await runtimeEnv();
 const admins=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!user.email||!admins.includes(user.email.toLowerCase()))return NextResponse.json({ok:false,error:"ADMIN_REQUIRED"},{status:403});
 const raw=await request.text();
 if(raw.length>2048)return NextResponse.json({ok:false,error:"INVALID_REQUEST"},{status:400});
 let body:{id?:unknown;sourceUrl?:unknown};
 try{body=JSON.parse(raw)}catch{return NextResponse.json({ok:false,error:"INVALID_REQUEST"},{status:400})}
 if(typeof body.id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{8}$/i.test(body.id)||typeof body.sourceUrl!=="string"||body.sourceUrl.length>1500)return NextResponse.json({ok:false,error:"INVALID_REQUEST"},{status:400});
 const service=await createServiceSupabaseClient();
 if(!service)return NextResponse.json({ok:false,error:"QUEUE_NOT_CONFIGURED"},{status:503});
 const {data:job,error:lookupError}=await service.from("atlas_perfume_research_jobs").select("id,house,perfume_name,status").eq("id",body.id).eq("owner_user_id",user.id).maybeSingle();
 if(lookupError)return NextResponse.json({ok:false,error:"QUEUE_LOOKUP_FAILED"},{status:502});
 if(!job)return NextResponse.json({ok:false,error:"JOB_NOT_FOUND"},{status:404});
 if(job.status!=="queued")return NextResponse.json({ok:false,error:"JOB_NOT_QUEUED"},{status:409});
 const plan=planPerfumeSourceRetrieval(job.house,body.sourceUrl);
 if(!plan.ok)return NextResponse.json({ok:false,error:plan.reason},{status:422});
 const {data:claimed,error:claimError}=await service.from("atlas_perfume_research_jobs").update({status:"researching",updated_at:new Date().toISOString()}).eq("id",job.id).eq("owner_user_id",user.id).eq("status","queued").select("id").maybeSingle();
 if(claimError)return NextResponse.json({ok:false,error:"JOB_CLAIM_FAILED"},{status:502});
 if(!claimed)return NextResponse.json({ok:false,error:"JOB_ALREADY_CLAIMED"},{status:409});
 const result=await researchPerfumeSource(job.house,job.perfume_name,body.sourceUrl);
 if(!result.ok){
  await service.from("atlas_perfume_research_jobs").update({status:"held",error_code:result.reason,updated_at:new Date().toISOString()}).eq("id",job.id).eq("owner_user_id",user.id).eq("status","researching");
  return NextResponse.json({ok:false,error:result.reason},{status:422});
 }
 const candidate=result.candidate;
 const {data:saved,error}=await service.from("atlas_perfume_research_jobs").update({status:"draft_ready",source_url:candidate.sourceUrl,source_type:candidate.sourceType,draft_payload:candidate,error_code:null,updated_at:new Date().toISOString()}).eq("id",job.id).eq("owner_user_id",user.id).eq("status","researching").select("id,status").maybeSingle();
 if(error)return NextResponse.json({ok:false,error:"DRAFT_SAVE_FAILED"},{status:502});
 if(!saved)return NextResponse.json({ok:false,error:"JOB_CHANGED"},{status:409});
 return NextResponse.json({ok:true,job:saved},{headers:{"cache-control":"no-store"}});
}
