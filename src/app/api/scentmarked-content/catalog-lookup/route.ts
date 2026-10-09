import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

export async function GET(request:NextRequest){
 const workspace=await createServerSupabaseClient();
 if(!workspace)return NextResponse.json({ok:false,message:"Atlas workspace is not configured"},{status:503});
 const {data:{user}}=await workspace.auth.getUser();
 if(!user)return NextResponse.json({ok:false,message:"Sign in required"},{status:401});
 const name=(request.nextUrl.searchParams.get("name")??"").trim();
 if(name.length<2||name.length>120)return NextResponse.json({ok:false,message:"Enter a perfume name between 2 and 120 characters"},{status:400});
 const base=process.env.SCENTMARKED_SUPABASE_URL;
 const privateKey=process.env.SCENTMARKED_SUPABASE_SERVICE_ROLE_KEY;
 const key=privateKey||process.env.SCENTMARKED_SUPABASE_ANON_KEY;
 if(!base||!key)return NextResponse.json({ok:false,message:"Scentmarked catalog lookup is not configured"},{status:503});
 let url:URL;try{url=new URL("/rest/v1/perfumes",base);if(url.protocol!=="https:")throw Error("HTTPS required");}catch{return NextResponse.json({ok:false,message:"Scentmarked catalog URL is invalid"},{status:503});}
 url.searchParams.set("select","id,name,slug,brand_id,status");
 url.searchParams.set("name","ilike.*"+name.replace(/[*,()\\%_]/g,"")+"*");
 url.searchParams.set("limit","15");
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch(url,{headers:{apikey:key,Authorization:`Bearer ${key}`},signal:controller.signal,cache:"no-store"});
  if(!response.ok)return NextResponse.json({ok:false,message:"Scentmarked catalog lookup failed"},{status:502});
  const data=await response.json() as unknown;
  if(!Array.isArray(data))return NextResponse.json({ok:false,message:"Unexpected catalog response"},{status:502});
  const matches=data.filter((v):v is {id:string;name:string;slug:string;brand_id:string;status:string}=>typeof v==="object"&&v!==null&&typeof v.id==="string"&&typeof v.name==="string"&&typeof v.slug==="string").map(v=>({id:v.id,name:v.name,slug:v.slug,brandId:v.brand_id,status:v.status}));
  return NextResponse.json({ok:true,matches,scope:privateKey?"service_role_read":"anon_visible_only",complete:false,duplicateCheckStatus:"INCOMPLETE",safeToCreate:false,note:privateKey?"Search includes accessible drafts but only checks name candidates; brand identity and alternate names still require review.":"Results are limited by Scentmarked public read permissions. No match does not rule out private drafts or differently named duplicates."},{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({ok:false,message:"Scentmarked catalog lookup unavailable"},{status:503});}finally{clearTimeout(timeout);}
}
