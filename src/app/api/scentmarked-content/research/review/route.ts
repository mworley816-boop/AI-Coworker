import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {runtimeEnv} from "@/lib/runtime-env";
import {planPerfumeResearchReview} from "@/lib/scentmarked-perfume-research-review-policy";
/** Admin-only review. Approval marks the Atlas draft, never publishes it. */
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
 let body:{id?:unknown;decision?:unknown};
 try{body=JSON.parse(raw)}catch{return NextResponse.json({ok:false,error:"INVALID_REQUEST"},{status:400})}
 if(typeof body.id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id))return NextResponse.json({ok:false,error:"INVALID_JOB_ID"},{status:400});
 if(body.decision!=="approve"&&body.decision!=="reject")return NextResponse.json({ok:false,error:"INVALID_DECISION"},{status:400});
 const service=await createServiceSupabaseClient();
 if(!service)return NextResponse.json({ok:false,error:"QUEUE_NOT_CONFIGURED"},{status:503});
 const {data:job,error:lookupError}=await service.from("atlas_perfume_research_jobs").select("status,source_url,source_type,draft_payload").eq("id",body.id).eq("owner_user_id",user.id).maybeSingle();
 if(lookupError)return NextResponse.json({ok:false,error:"QUEUE_LOOKUP_FAILED"},{status:502});
 if(!job)return NextResponse.json({ok:false,error:"JOB_NOT_FOUND"},{status:404});
 const plan=planPerfumeResearchReview(body.decision,job);
 if(!plan.ok)return NextResponse.json({ok:false,error:plan.reason},{status:409});
 const {data:updated,error}=await service.from("atlas_perfume_research_jobs").update({...plan.update,updated_at:new Date().toISOString()}).eq("id",body.id).eq("owner_user_id",user.id).eq("status","draft_ready").eq("source_url",job.source_url).eq("source_type",job.source_type).select("id,status").maybeSingle();
 if(error)return NextResponse.json({ok:false,error:"REVIEW_UPDATE_FAILED"},{status:502});
 if(!updated)return NextResponse.json({ok:false,error:"JOB_CHANGED"},{status:409});
 return NextResponse.json({ok:true,job:updated},{headers:{"cache-control":"no-store"}});
}
