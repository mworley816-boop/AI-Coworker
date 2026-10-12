import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {runtimeEnv} from "@/lib/runtime-env";
import {validatePerfumeResearchCandidate,type PerfumeResearchCandidate} from "@/lib/scentmarked-perfume-research-policy";
/** Admin submits a sourced draft for review. No publication or external fetch. */
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
 if(raw.length>8192)return NextResponse.json({ok:false,error:"INVALID_REQUEST"},{status:400});
 let body:{id?:unknown;candidate?:PerfumeResearchCandidate};
 try{body=JSON.parse(raw)}catch{return NextResponse.json({ok:false,error:"INVALID_REQUEST"},{status:400})}
 if(typeof body.id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id))return NextResponse.json({ok:false,error:"INVALID_JOB_ID"},{status:400});
 const validation=validatePerfumeResearchCandidate(body.candidate as PerfumeResearchCandidate);
 if(!validation.ok)return NextResponse.json({ok:false,error:validation.reason},{status:400});
 const service=await createServiceSupabaseClient();
 if(!service)return NextResponse.json({ok:false,error:"QUEUE_NOT_CONFIGURED"},{status:503});
 const {data:job,error:lookupError}=await service.from("atlas_perfume_research_jobs").select("house,perfume_name,status").eq("id",body.id).eq("owner_user_id",user.id).maybeSingle();
 if(lookupError)return NextResponse.json({ok:false,error:"QUEUE_LOOKUP_FAILED"},{status:502});
 if(!job)return NextResponse.json({ok:false,error:"JOB_NOT_FOUND"},{status:404});
 if(job.status!=="queued"&&job.status!=="researching")return NextResponse.json({ok:false,error:"JOB_NOT_EDITABLE"},{status:409});
 const candidate=validation.candidate;
 if(candidate.house.toLocaleLowerCase("en")!==job.house.trim().toLocaleLowerCase("en")||candidate.name.toLocaleLowerCase("en")!==job.perfume_name.trim().toLocaleLowerCase("en"))return NextResponse.json({ok:false,error:"IDENTITY_MISMATCH"},{status:409});
 const {data:updated,error}=await service.from("atlas_perfume_research_jobs").update({status:"draft_ready",source_url:candidate.sourceUrl,source_type:candidate.sourceType,draft_payload:candidate,error_code:null,updated_at:new Date().toISOString()}).eq("id",body.id).eq("owner_user_id",user.id).in("status",["queued","researching"]).select("id,status").maybeSingle();
 if(error)return NextResponse.json({ok:false,error:"DRAFT_UPDATE_FAILED"},{status:502});
 if(!updated)return NextResponse.json({ok:false,error:"JOB_CHANGED"},{status:409});
 return NextResponse.json({ok:true,job:updated},{headers:{"cache-control":"no-store"}});
}
