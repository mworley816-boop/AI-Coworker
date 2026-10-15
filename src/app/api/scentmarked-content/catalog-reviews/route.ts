import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {runtimeEnv} from "@/lib/runtime-env";

const allowed=new Set(["needs_research","existing_alternate","candidate","excluded"]);
async function authorize(){
 const session=await createServerSupabaseClient();
 const service=await createServiceSupabaseClient();
 if(!session||!service)return {error:NextResponse.json({ok:false,error:"ATLAS_STORAGE_NOT_CONFIGURED"},{status:503})};
 const {data:{user}}=await session.auth.getUser();
 if(!user)return {error:NextResponse.json({ok:false,error:"SIGN_IN_REQUIRED"},{status:401})};
 const env=await runtimeEnv();
 const admins=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!user.email||!admins.includes(user.email.toLowerCase()))return {error:NextResponse.json({ok:false,error:"ADMIN_REQUIRED"},{status:403})};
 return {service,user};
}
export async function GET(){
 const auth=await authorize();if(auth.error)return auth.error;
 const {data,error}=await auth.service!.from("atlas_perfume_catalog_reviews").select("house,perfume_name,decision,reviewer_notes,source_url,source_type,discontinued_status,updated_at").eq("owner_user_id",auth.user!.id).order("updated_at",{ascending:false}).limit(1000);
 if(error)return NextResponse.json({ok:false,error:"REVIEW_STORAGE_UNAVAILABLE"},{status:503});
 return NextResponse.json({ok:true,rows:data??[]},{headers:{"cache-control":"no-store"}});
}
export async function POST(request:Request){
 const auth=await authorize();if(auth.error)return auth.error;
 let body:unknown;try{body=await request.json();}catch{return NextResponse.json({ok:false,error:"INVALID_JSON"},{status:400});}
 if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({ok:false,error:"INVALID_REVIEW"},{status:400});
 const r=body as Record<string,unknown>;
 const house=typeof r.house==="string"?r.house.trim():"";
 const name=typeof r.perfume_name==="string"?r.perfume_name.trim():"";
 const decision=r.decision;
 const notes=typeof r.reviewer_notes==="string"?r.reviewer_notes:"";
 if(!house||house.length>120||!name||name.length>180||typeof decision!=="string"||!allowed.has(decision)||notes.length>4000)return NextResponse.json({ok:false,error:"INVALID_REVIEW"},{status:400});
 const sourceUrl=typeof r.source_url==="string"?r.source_url.trim():"";
 if(sourceUrl&&(!sourceUrl.startsWith("https://")||sourceUrl.length>2048))return NextResponse.json({ok:false,error:"INVALID_SOURCE_URL"},{status:400});
 const payload={owner_user_id:auth.user!.id,house,perfume_name:name,decision,reviewer_notes:notes,source_url:sourceUrl||null,source_type:typeof r.source_type==="string"?r.source_type.slice(0,100):null,discontinued_status:typeof r.discontinued_status==="string"?r.discontinued_status.slice(0,120):"unverified",updated_at:new Date().toISOString()};
 const {error}=await auth.service!.from("atlas_perfume_catalog_reviews").upsert(payload,{onConflict:"owner_user_id,house,perfume_name"});
 if(error)return NextResponse.json({ok:false,error:"REVIEW_SAVE_FAILED"},{status:503});
 return NextResponse.json({ok:true},{headers:{"cache-control":"no-store"}});
}
