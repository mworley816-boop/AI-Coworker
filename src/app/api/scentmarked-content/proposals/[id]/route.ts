import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const workspace=await createServerSupabaseClient();
 if(!workspace)return NextResponse.json({ok:false,message:"Atlas workspace is not configured"},{status:503});
 const {data:{user}}=await workspace.auth.getUser();
 if(!user)return NextResponse.json({ok:false,message:"Sign in required"},{status:401});
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
  return NextResponse.json({ok:false,message:"Invalid proposal ID"},{status:400});
 const {data,error}=await workspace.from("scentmarked_proposals")
  .select("id,brand,perfume_name,description,notes,source_leads,duplicate_check_status,review_status,created_at")
  .eq("id",id).eq("user_id",user.id).maybeSingle();
 if(error)return NextResponse.json({ok:false,message:"Unable to load proposal"},{status:503});
 if(!data)return NextResponse.json({ok:false,message:"Proposal not found"},{status:404});
 return NextResponse.json({ok:true,proposal:data,canApprove:false,canCreateDraft:false,canPublish:false},{headers:{"cache-control":"no-store"}});
}
