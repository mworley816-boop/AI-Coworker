import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {runtimeEnv} from "@/lib/runtime-env";
/** Human review only: never publishes or changes public storage. */
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
 let body:{id?:unknown;decision?:unknown;identityVerified?:unknown;rightsCleared?:unknown};
 try{body=JSON.parse(raw)}catch{return NextResponse.json({ok:false,error:"INVALID_REQUEST"},{status:400})}
 const id=body.id;
 if(typeof id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return NextResponse.json({ok:false,error:"INVALID_JOB_ID"},{status:400});
 if(body.decision!=="approve"&&body.decision!=="reject")return NextResponse.json({ok:false,error:"INVALID_DECISION"},{status:400});
 if(body.decision==="approve"&&(body.identityVerified!==true||body.rightsCleared!==true))return NextResponse.json({ok:false,error:"REVIEW_CONFIRMATION_REQUIRED"},{status:400});
 const service=await createServiceSupabaseClient();
 if(!service)return NextResponse.json({ok:false,error:"QUEUE_NOT_CONFIGURED"},{status:503});
 const {data:job,error:lookupError}=await service.from("scentmarked_graphic_jobs").select("owner_user_id,status,output_storage_path").eq("id",id).maybeSingle();
 if(lookupError)return NextResponse.json({ok:false,error:"QUEUE_LOOKUP_FAILED"},{status:502});
 if(!job||job.owner_user_id!==user.id)return NextResponse.json({ok:false,error:"JOB_NOT_FOUND"},{status:404});
 if(job.status!=="generated"||job.output_storage_path!=="generated/"+id+".png")return NextResponse.json({ok:false,error:"JOB_NOT_REVIEWABLE"},{status:409});
 const approve=body.decision==="approve";
 const {data:updated,error}=await service.from("scentmarked_graphic_jobs").update({status:approve?"approved":"held",identity_verified:approve,rights_cleared:approve,error_code:approve?null:"REJECTED_BY_REVIEWER",updated_at:new Date().toISOString()}).eq("id",id).eq("owner_user_id",user.id).eq("status","generated").select("id,status").maybeSingle();
 if(error)return NextResponse.json({ok:false,error:"REVIEW_UPDATE_FAILED"},{status:502});
 if(!updated)return NextResponse.json({ok:false,error:"JOB_CHANGED"},{status:409});
 return NextResponse.json({ok:true,status:updated.status},{headers:{"cache-control":"no-store"}});
}
