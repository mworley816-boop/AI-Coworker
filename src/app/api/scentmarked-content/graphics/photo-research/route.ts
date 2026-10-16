import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {runtimeEnv} from "@/lib/runtime-env";

/** Source discovery only. No image downloads, rights assumptions, or production writes. */
export async function GET(request:NextRequest){
 const db=await createServerSupabaseClient();
 if(!db)return NextResponse.json({ok:false,error:"WORKSPACE_NOT_CONFIGURED"},{status:503});
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({ok:false,error:"SIGN_IN_REQUIRED"},{status:401});
 const env=await runtimeEnv();
 const admins=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!user.email||!admins.includes(user.email.toLowerCase()))return NextResponse.json({ok:false,error:"ADMIN_REQUIRED"},{status:403});
 const brand=(request.nextUrl.searchParams.get("brand")??"").trim();
 const name=(request.nextUrl.searchParams.get("name")??"").trim();
 if(brand.length<2||brand.length>120||name.length<2||name.length>160)return NextResponse.json({ok:false,error:"INVALID_PERFUME_IDENTITY"},{status:400});
 const query=[brand,name,"official perfume bottle product image"].join(" ");
 const searches=[
  {label:"Search official product photos",url:"https://www.google.com/search?tbm=isch&q="+encodeURIComponent(query)},
  {label:"Search manufacturer product pages",url:"https://www.google.com/search?q="+encodeURIComponent(brand+" "+name+" official site perfume")},
  {label:"Search product photos on Bing",url:"https://www.bing.com/images/search?q="+encodeURIComponent(query)}
 ];
 return NextResponse.json({ok:true,query,searches,candidates,status:"SOURCES_NOT_YET_VERIFIED",canUseImages:false,notice:"These are research links, not verified manufacturer images. Confirm exact product identity and image usage rights before using or publishing."},{headers:{"cache-control":"no-store"}});
}
