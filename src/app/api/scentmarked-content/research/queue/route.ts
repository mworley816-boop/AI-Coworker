import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {runtimeEnv} from "@/lib/runtime-env";
/** Admin-only, owner-scoped research queue. Does not fetch or publish perfumes. */
async function authorized(request:Request){
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return {error:"INVALID_ORIGIN",status:403} as const;
 const session=await createServerSupabaseClient();
 if(!session)return {error:"WORKSPACE_NOT_CONFIGURED",status:503} as const;
 const {data:{user}}=await session.auth.getUser();
 if(!user)return {error:"SIGN_IN_REQUIRED",status:401} as const;
 const env=await runtimeEnv();
 const admins=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!user.email||!admins.includes(user.email.toLowerCase()))return {error:"ADMIN_REQUIRED",status:403} as const;
 const service=await createServiceSupabaseClient();
 if(!service)return {error:"QUEUE_NOT_CONFIGURED",status:503} as const;
 return {user,service};
}
export async function GET(request:Request){
 const auth=await authorized(request);
 if("error" in auth)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 const {data,error}=await auth.service.from("atlas_perfume_research_jobs").select("id,house,perfume_name,status,source_url,source_type,draft_payload,created_at,updated_at").eq("owner_user_id",auth.user.id).order("created_at",{ascending:false}).limit(50);
 if(error)return NextResponse.json({ok:false,error:"QUEUE_LOOKUP_FAILED"},{status:502});
 return NextResponse.json({ok:true,jobs:data??[]},{headers:{"cache-control":"no-store"}});
}
export async function POST(request:Request){
 const auth=await authorized(request);
 if("error" in auth)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 const raw=await request.text();
 if(raw.length>2048)return NextResponse.json({ok:false,error:"INVALID_REQUEST"},{status:400});
 let body:{house?:unknown;name?:unknown};
 try{body=JSON.parse(raw)}catch{return NextResponse.json({ok:false,error:"INVALID_REQUEST"},{status:400})}
 if(typeof body.house!=="string"||typeof body.name!=="string"||!body.house.trim()||!body.name.trim()||body.house.length>120||body.name.length>180)return NextResponse.json({ok:false,error:"INVALID_PERFUME_IDENTITY"},{status:400});
 const {data,error}=await auth.service.from("atlas_perfume_research_jobs").insert({owner_user_id:auth.user.id,house:body.house.trim(),perfume_name:body.name.trim(),status:"queued"}).select("id,status").single();
 if(error?.code==="23505")return NextResponse.json({ok:false,error:"ACTIVE_RESEARCH_JOB_EXISTS"},{status:409});
 if(error)return NextResponse.json({ok:false,error:"QUEUE_INSERT_FAILED"},{status:502});
 return NextResponse.json({ok:true,job:data},{status:201,headers:{"cache-control":"no-store"}});
}
