import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

// Read-only review history. Ownership is checked explicitly and enforced by RLS.
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const workspace=await createServerSupabaseClient();
 if(!workspace)return NextResponse.json({ok:false,message:"Atlas workspace is not configured"},{status:503});
 const {data:{user}}=await workspace.auth.getUser();
 if(!user)return NextResponse.json({ok:false,message:"Sign in required"},{status:401});
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  return NextResponse.json({ok:false,message:"Invalid proposal ID"},{status:400});
 const {data:proposal,error:proposalError}=await workspace.from("scentmarked_proposals")
  .select("id").eq("id",id).eq("user_id",user.id).maybeSingle();
 if(proposalError)return NextResponse.json({ok:false,message:"Unable to verify proposal ownership"},{status:503});
 if(!proposal)return NextResponse.json({ok:false,message:"Proposal not found"},{status:404});
 const {data,error}=await workspace.from("scentmarked_proposal_reviews")
  .select("id,decision,rationale,created_at").eq("proposal_id",id)
  .order("created_at",{ascending:false}).limit(50);
 if(error)return NextResponse.json({ok:false,message:"Unable to load review history"},{status:503});
 return NextResponse.json({ok:true,reviews:data??[],readOnly:true},{headers:{"cache-control":"no-store"}});
}
