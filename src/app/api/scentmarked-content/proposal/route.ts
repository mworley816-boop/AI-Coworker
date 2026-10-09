import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

type ProposalInput={brand?:unknown;name?:unknown;description?:unknown;notes?:unknown;sources?:unknown};
const clean=(value:unknown,max:number)=>typeof value==="string"?value.trim().slice(0,max):"";
export async function POST(request:NextRequest){
 const workspace=await createServerSupabaseClient();
 if(!workspace)return NextResponse.json({ok:false,message:"Atlas workspace is not configured"},{status:503});
 const {data:{user}}=await workspace.auth.getUser();
 if(!user)return NextResponse.json({ok:false,message:"Sign in required"},{status:401});
 let body:ProposalInput;
 try{body=await request.json() as ProposalInput;}catch{return NextResponse.json({ok:false,message:"Invalid JSON"},{status:400});}
 const brand=clean(body.brand,120),name=clean(body.name,120);
 if(brand.length<2||name.length<2)return NextResponse.json({ok:false,message:"Brand and perfume name are required"},{status:400});
 const description=clean(body.description,1200),notes=clean(body.notes,800);
 if(body.sources!==undefined&&!Array.isArray(body.sources))return NextResponse.json({ok:false,message:"Sources must be a list of URLs"},{status:400});
 const leads=(body.sources??[]) as unknown[];
 if(leads.length>10||leads.some(s=>typeof s!=="string"||s.length>2048))return NextResponse.json({ok:false,message:"Invalid source leads"},{status:400});
 const sources:string[]=[];
 for(const lead of leads){
  try{const url=new URL(lead as string);if(!["http:","https:"].includes(url.protocol))throw Error("Unsupported protocol");sources.push(url.href);}
  catch{return NextResponse.json({ok:false,message:"Every source lead must be an HTTP(S) URL"},{status:400});}
 }
 const base=process.env.SCENTMARKED_SUPABASE_URL;
 const allowed=(process.env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase());
 const privileged=Boolean(user.email&&allowed.includes(user.email.toLowerCase())&&process.env.SCENTMARKED_SUPABASE_SERVICE_ROLE_KEY);
 const key=privileged?process.env.SCENTMARKED_SUPABASE_SERVICE_ROLE_KEY:process.env.SCENTMARKED_SUPABASE_ANON_KEY;
 if(!base||!key)return NextResponse.json({ok:false,message:"Catalog duplicate check is not configured; proposal withheld"},{status:503});
 let url:URL;
 try{url=new URL("/rest/v1/perfumes",base);if(url.protocol!=="https:")throw Error("HTTPS required");}
 catch{return NextResponse.json({ok:false,message:"Invalid catalog connection"},{status:503});}
 // This check is deliberately conservative: only exact same-name candidates are compared.
 url.searchParams.set("select","id,name,brands(name)");
 url.searchParams.set("name","ilike."+name.replace(/[*,()\\%_]/g,""));
 url.searchParams.set("limit","100");
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
 let candidates:unknown;
 try{const response=await fetch(url,{headers:{apikey:key,Authorization:"Bearer "+key},cache:"no-store",signal:controller.signal});if(!response.ok)throw Error("Catalog unavailable");candidates=await response.json();}
 catch{return NextResponse.json({ok:false,message:"Catalog duplicate check failed; proposal withheld"},{status:503});}
 finally{clearTimeout(timeout);}
 if(!Array.isArray(candidates))return NextResponse.json({ok:false,message:"Invalid catalog response; proposal withheld"},{status:503});
 if(candidates.length>=100)return NextResponse.json({ok:false,message:"Duplicate lookup reached its result limit; refine the search before preparing a proposal",duplicateCheckStatus:"RESULTS_TRUNCATED"},{status:409});
 const exact=candidates.some(row=>row&&typeof row==="object"&&"name" in row&&"brands" in row&&String(row.name).toLowerCase()===name.toLowerCase()&&row.brands&&typeof row.brands==="object"&&"name" in row.brands&&String(row.brands.name).toLowerCase()===brand.toLowerCase());
 if(exact)return NextResponse.json({ok:false,message:"Exact brand-and-name candidate exists; review the existing perfume instead",duplicateCheckStatus:"EXACT_DUPLICATE_CANDIDATE"},{status:409});
 const {data:saved,error:saveError}=await workspace.from("scentmarked_proposals").insert({user_id:user.id,brand,perfume_name:name,description,notes,source_leads:sources,duplicate_check_status:privileged?"EXACT_NAME_CHECKED_DRAFT_INCLUSIVE":"EXACT_NAME_CHECKED_PUBLIC_ONLY",review_status:"PENDING_ADMIN_REVIEW"}).select("id,created_at").single();
 if(saveError||!saved)return NextResponse.json({ok:false,message:"Proposal could not be saved. Apply the Atlas proposal-storage migration and retry; no catalog changes were made."},{status:503});
 return NextResponse.json({ok:true,proposal:{id:saved.id,createdAt:saved.created_at,brand,name,description,notes,sourceLeads:sources,claimStatus:"UNVERIFIED",duplicateCheckStatus:privileged?"EXACT_NAME_CHECKED_DRAFT_INCLUSIVE":"EXACT_NAME_CHECKED_PUBLIC_ONLY",approvalStatus:"PENDING_ADMIN_REVIEW",approvalRequirements:["INDEPENDENT_SOURCE_VERIFICATION","COMPLETE_DUPLICATE_REVIEW","SCENTMARKED_ADMIN_AUTHORIZATION","AUDITABLE_DRAFT_WRITE"],canCreateDraft:false,canPublish:false},message:"Review-only proposal saved to Atlas. Exact-name candidates checked; aliases and other duplicates still require review. No Scentmarked catalog or media writes performed."},{headers:{"cache-control":"no-store"}});
}
