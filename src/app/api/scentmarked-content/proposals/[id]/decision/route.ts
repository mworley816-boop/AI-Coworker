import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

// Database RPC enforces the administrator-provisioned reviewer role and atomically audits decisions.
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const workspace=await createServerSupabaseClient();
 if(!workspace)return NextResponse.json({ok:false,message:"Atlas workspace is not configured"},{status:503});
 const {data:{user}}=await workspace.auth.getUser();
 if(!user)return NextResponse.json({ok:false,message:"Sign in required"},{status:401});
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  return NextResponse.json({ok:false,message:"Invalid proposal ID"},{status:400});
 let body:unknown;
 try{body=await request.json();}catch{return NextResponse.json({ok:false,message:"Invalid JSON"},{status:400});}
 if(!body||typeof body!=="object")return NextResponse.json({ok:false,message:"Invalid review request"},{status:400});
 const values=body as Record<string,unknown>;
 const decision=values.decision,rationale=values.rationale;
 if((decision!=="NEEDS_CHANGES"&&decision!=="REJECTED")||typeof rationale!=="string"||rationale.trim().length<10||rationale.trim().length>2000)
  return NextResponse.json({ok:false,message:"Choose rejection or changes requested and provide a 10–2000 character explanation"},{status:400});
 const {data,error}=await workspace.rpc("review_scentmarked_proposal",{p_proposal_id:id,p_decision:decision,p_rationale:rationale.trim()});
 if(error)return NextResponse.json({ok:false,message:error.code==="42501"?"Reviewer authorization required":"Review could not be recorded; verify proposal is pending",code:error.code},{status:error.code==="42501"?403:409});
 return NextResponse.json({ok:true,reviewId:data,decision,message:"Review decision saved and audited. No Scentmarked catalog or media changes were made."},{headers:{"cache-control":"no-store"}});
}
