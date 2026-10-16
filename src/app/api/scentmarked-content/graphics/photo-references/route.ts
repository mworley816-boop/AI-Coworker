import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {runtimeEnv} from "@/lib/runtime-env";

async function auth(){
 const db=await createServerSupabaseClient();if(!db)return {code:503 as const};
 const {data:{user}}=await db.auth.getUser();if(!user)return {code:401 as const};
 const env=await runtimeEnv();const allowed=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase());
 if(!user.email||!allowed.includes(user.email.toLowerCase()))return {code:403 as const};
 return {code:200 as const,db,user};
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request:NextRequest){
 const a=await auth();if(a.code!==200)return NextResponse.json({ok:false,error:"NOT_AUTHORIZED"},{status:a.code});
 const id=request.nextUrl.searchParams.get("perfumeId")??"";
 if(!uuid.test(id))return NextResponse.json({ok:false,error:"INVALID_PERFUME_ID"},{status:400});
 const {data,error}=await a.db.from("atlas_product_photo_references").select("id,perfume_id,brand,perfume_name,source_url,identity_verified,rights_cleared,created_at").eq("owner_user_id",a.user.id).eq("perfume_id",id).order("created_at",{ascending:false}).limit(20);
 return NextResponse.json(error?{ok:false,error:"REFERENCE_READ_FAILED"}:{ok:true,references:data??[]},{status:error?500:200,headers:{"cache-control":"no-store"}});
}
export async function POST(request:NextRequest){
 const a=await auth();if(a.code!==200)return NextResponse.json({ok:false,error:"NOT_AUTHORIZED"},{status:a.code});
 if(request.headers.get("origin")&&request.headers.get("origin")!==request.nextUrl.origin)return NextResponse.json({ok:false,error:"INVALID_ORIGIN"},{status:403});
 const raw=await request.text();if(raw.length>4096)return NextResponse.json({ok:false,error:"REQUEST_TOO_LARGE"},{status:413});
 let x:Record<string,unknown>;try{x=JSON.parse(raw)}catch{return NextResponse.json({ok:false,error:"INVALID_JSON"},{status:400})}
 const perfumeId=String(x.perfumeId??""),brand=String(x.brand??"").trim(),name=String(x.perfumeName??"").trim(),source=String(x.sourceUrl??"").trim();
 if(!uuid.test(perfumeId)||!brand||brand.length>120||!name||name.length>160||source.length>2000||x.identityVerified!==true||x.rightsCleared!==true)return NextResponse.json({ok:false,error:"REFERENCE_REVIEW_REQUIRED"},{status:400});
 let url:URL;try{url=new URL(source);if(url.protocol!=="https:"||url.username||url.password||url.hostname==="localhost"||!url.hostname.includes("."))throw Error("Invalid source");}catch{return NextResponse.json({ok:false,error:"INVALID_SOURCE_URL"},{status:400})}
 const {error}=await a.db.from("atlas_product_photo_references").upsert({owner_user_id:a.user.id,perfume_id:perfumeId,brand,perfume_name:name,source_url:url.toString(),identity_verified:true,rights_cleared:true},{onConflict:"owner_user_id,perfume_id,source_url"});
 return NextResponse.json(error?{ok:false,error:"REFERENCE_SAVE_FAILED"}:{ok:true,saved:true,notice:"Saved reviewed source URL and attestations; image bytes have not been copied or composited."},{status:error?500:201});
}
