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
 return NextResponse.json({ok:true,proposal:{brand,name,description,notes,sourceLeads:sources,claimStatus:"UNVERIFIED",duplicateCheckStatus:"NOT_PERFORMED_BY_THIS_ENDPOINT",approvalStatus:"PENDING_ADMIN_REVIEW",canCreateDraft:false,canPublish:false},message:"Review-only proposal prepared. No database or media writes were performed."},{headers:{"cache-control":"no-store"}});
}
