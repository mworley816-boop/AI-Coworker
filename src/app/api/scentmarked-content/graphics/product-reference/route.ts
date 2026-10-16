import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {runtimeEnv} from "@/lib/runtime-env";

/** Read-only catalog image research: candidates are NOT licensed or identity-verified. */
export async function GET(request:NextRequest){
 const db=await createServerSupabaseClient();
 if(!db)return NextResponse.json({ok:false,error:"WORKSPACE_NOT_CONFIGURED"},{status:503});
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({ok:false,error:"SIGN_IN_REQUIRED"},{status:401});
 const env=await runtimeEnv();
 const admins=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!user.email||!admins.includes(user.email.toLowerCase()))return NextResponse.json({ok:false,error:"ADMIN_REQUIRED"},{status:403});
 const id=request.nextUrl.searchParams.get("perfumeId")??"";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return NextResponse.json({ok:false,error:"INVALID_PERFUME_ID"},{status:400});
 const base=env.SCENTMARKED_SUPABASE_URL;
 const key=env.SCENTMARKED_SUPABASE_SERVICE_ROLE_KEY??env.SCENTMARKED_SUPABASE_ANON_KEY;
 if(!base||!key)return NextResponse.json({ok:false,error:"CATALOG_NOT_CONFIGURED"},{status:503});
 let url:URL;try{url=new URL("/rest/v1/perfumes",base);if(url.protocol!=="https:")throw Error("Invalid protocol");}catch{return NextResponse.json({ok:false,error:"CATALOG_URL_INVALID"},{status:503});}
 url.searchParams.set("id","eq."+id);
 url.searchParams.set("select","id,name,image_url,brands(name)");
 url.searchParams.set("limit","1");
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch(url,{headers:{apikey:key,Authorization:"Bearer "+key},cache:"no-store",signal:controller.signal});
  if(!response.ok)return NextResponse.json({ok:false,error:"CATALOG_LOOKUP_FAILED"},{status:502});
  const rows=await response.json() as Array<{id:string;name:string;image_url:string|null;brands?:{name:string}|null}>;
  const perfume=rows?.[0];
  if(!perfume)return NextResponse.json({ok:false,error:"PERFUME_NOT_FOUND"},{status:404});
  const imageUrl=perfume.image_url&&/^https:\/\//i.test(perfume.image_url)?perfume.image_url:null;
  return NextResponse.json({ok:true,perfume:{id:perfume.id,name:perfume.name,brand:perfume.brands?.name??null,imageUrl},identityVerified:false,usageRightsVerified:false,canUseForProductComposite:false,notice:"Catalog image is a research candidate only. Verify official product identity and image usage rights before compositing or publishing."},{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({ok:false,error:"CATALOG_LOOKUP_UNAVAILABLE"},{status:503});}finally{clearTimeout(timeout);}
}
