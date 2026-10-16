import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {runtimeEnv} from "@/lib/runtime-env";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Approval records a private decision only; it never publishes. */
export async function POST(request:NextRequest){
 const db=await createServerSupabaseClient();if(!db)return NextResponse.json({ok:false,error:"WORKSPACE_NOT_CONFIGURED"},{status:503});
 const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({ok:false,error:"SIGN_IN_REQUIRED"},{status:401});
 const env=await runtimeEnv();const admins=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase());
 if(!user.email||!admins.includes(user.email.toLowerCase()))return NextResponse.json({ok:false,error:"ADMIN_REQUIRED"},{status:403});
 if(request.headers.get("origin")&&request.headers.get("origin")!==request.nextUrl.origin)return NextResponse.json({ok:false,error:"INVALID_ORIGIN"},{status:403});
 let body:Record<string,unknown>;try{const raw=await request.text();if(raw.length>2048)return NextResponse.json({ok:false,error:"REQUEST_TOO_LARGE"},{status:413});body=JSON.parse(raw)}catch{return NextResponse.json({ok:false,error:"INVALID_JSON"},{status:400})}
 const id=String(body.id??""),decision=String(body.decision??"");
 if(!uuid.test(id)||!["approved","rejected"].includes(decision))return NextResponse.json({ok:false,error:"INVALID_REVIEW"},{status:400});
 if(decision==="approved"&&(body.identityVerified!==true||body.rightsCleared!==true))return NextResponse.json({ok:false,error:"CLEARANCE_REQUIRED"},{status:422});
 const {data,error}=await db.from("atlas_product_composites").update({review_status:decision,identity_verified:decision==="approved",rights_cleared:decision==="approved"}).eq("id",id).eq("owner_user_id",user.id).eq("review_status","pending").select("id,review_status").maybeSingle();
 if(error)return NextResponse.json({ok:false,error:"REVIEW_SAVE_FAILED"},{status:500});
 if(!data)return NextResponse.json({ok:false,error:"PENDING_COMPOSITE_NOT_FOUND"},{status:409});
 return NextResponse.json({ok:true,composite:data,notice:"Private review decision recorded; nothing published."},{headers:{"cache-control":"no-store"}});
}
