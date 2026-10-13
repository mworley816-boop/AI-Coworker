import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

export async function GET(request:NextRequest){
 const workspace=await createServerSupabaseClient();
 if(!workspace)return NextResponse.json({ok:false,message:"Atlas workspace is not configured"},{status:503});
 const {data:{user}}=await workspace.auth.getUser();
 if(!user)return NextResponse.json({ok:false,message:"Sign in required"},{status:401});
 const name=(request.nextUrl.searchParams.get("name")??"").trim();
 if(name.length<2||name.length>120)return NextResponse.json({ok:false,message:"Enter a perfume name between 2 and 120 characters"},{status:400});
 const brand=(request.nextUrl.searchParams.get("brand")??"").trim();
 const aliases=(request.nextUrl.searchParams.get("aliases")??"").split(",").map(s=>s.trim()).filter(s=>s.length>=2&&s.length<=120).slice(0,5);
 if(brand.length>120)return NextResponse.json({ok:false,message:"Brand name is too long"},{status:400});
 const base=process.env.SCENTMARKED_SUPABASE_URL;
 const allowedAdmins=(process.env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 const isAuthorizedAdmin=Boolean(user.email&&allowedAdmins.includes(user.email.toLowerCase()));
 // Email allowlisting is only a read-scope restriction, never authorization to create or publish.
 const privateKey=isAuthorizedAdmin?process.env.SCENTMARKED_SUPABASE_SERVICE_ROLE_KEY:undefined;
 const key=privateKey||process.env.SCENTMARKED_SUPABASE_ANON_KEY;
 const accessMode=privateKey?"service_role_read":"anon_visible_only";
 if(!base||!key)return NextResponse.json({ok:false,message:"Scentmarked catalog lookup is not configured"},{status:503});
 let url:URL;try{url=new URL("/rest/v1/perfumes",base);if(url.protocol!=="https:")throw Error("HTTPS required");}catch{return NextResponse.json({ok:false,message:"Scentmarked catalog URL is invalid"},{status:503});}
 url.searchParams.set("select","id,name,slug,brand_id,status,brands(name,slug)");
 const searchNames=[name,...aliases].map(s=>s.replace(/[*,()\\%_]/g,"")).filter(Boolean);
 url.searchParams.set("or","("+searchNames.map(s=>"name.ilike.*"+s+"*").join(",")+")");
 url.searchParams.set("limit","16");
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch(url,{headers:{apikey:key,Authorization:`Bearer ${key}`},signal:controller.signal,cache:"no-store"});
  if(!response.ok)return NextResponse.json({ok:false,message:"Scentmarked catalog lookup failed"},{status:502});
  const data=await response.json() as unknown;
  if(!Array.isArray(data))return NextResponse.json({ok:false,message:"Unexpected catalog response"},{status:502});
  const matches=data.filter((v):v is {id:string;name:string;slug:string;brand_id:string;status:string;brands?:{name?:string;slug?:string}|null}=>typeof v==="object"&&v!==null&&typeof v.id==="string"&&typeof v.name==="string"&&typeof v.slug==="string").map(v=>({id:v.id,name:v.name,slug:v.slug,brandId:v.brand_id,brandName:v.brands?.name??null,status:v.status,brandMatch:brand?String(v.brands?.name??"").trim().toLowerCase()===brand.toLowerCase():null,matchClass:brand&&String(v.brands?.name??"").trim().toLowerCase()===brand.toLowerCase()&&v.name.trim().toLowerCase()===name.toLowerCase()?"EXACT_BRAND_AND_NAME":brand&&String(v.brands?.name??"").trim().toLowerCase()!==brand.toLowerCase()?"DIFFERENT_BRAND":"REVIEW_CANDIDATE"}));
  const truncated=matches.length>15;
  const exactMatchFound=matches.some(m=>m.matchClass==="EXACT_BRAND_AND_NAME");
  const resultStatus=exactMatchFound?"EXACT_DUPLICATE_CANDIDATE":truncated?"PARTIAL_RESULTS":"REVIEW_REQUIRED";
  const reviewRequiredReasons=[...(privateKey?[]:["PRIVATE_DRAFTS_NOT_CHECKED"]),...(truncated?["RESULTS_TRUNCATED"]:[]),...(!brand?["BRAND_NOT_SPECIFIED"]:[]),...(exactMatchFound?["EXACT_DUPLICATE_CANDIDATE"]:[]),"ALIASES_AND_VARIANTS_NOT_EXHAUSTIVE"];
  const visibleMatches=matches.slice(0,15);
  return NextResponse.json({ok:true,matches:visibleMatches,truncated,reviewRequiredReasons,creationDecision:"HOLD_FOR_REVIEW",approvalStatus:"PENDING_ADMIN_REVIEW",canCreateDraft:false,canPublish:false,resultStatus,brandFilterApplied:Boolean(brand),aliasesChecked:aliases.length,exactMatchCount:visibleMatches.filter(m=>m.matchClass==="EXACT_BRAND_AND_NAME").length,scope:accessMode,complete:false,duplicateCheckStatus:"INCOMPLETE",safeToCreate:false,note:privateKey?"Search includes accessible drafts but only checks name candidates; brand identity and alternate names still require review.":"Results are limited by Scentmarked public read permissions. No match does not rule out private drafts or differently named duplicates."},{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({ok:false,message:"Scentmarked catalog lookup unavailable"},{status:503});}finally{clearTimeout(timeout);}
}
