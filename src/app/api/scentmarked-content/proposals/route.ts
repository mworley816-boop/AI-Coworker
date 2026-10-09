import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

// Review queue: RLS limits results to the authenticated Atlas user.
export async function GET(){
 const workspace=await createServerSupabaseClient();
 if(!workspace)return NextResponse.json({ok:false,message:"Atlas workspace is not configured"},{status:503});
 const {data:{user}}=await workspace.auth.getUser();
 if(!user)return NextResponse.json({ok:false,message:"Sign in required"},{status:401});
 const {data,error}=await workspace.from("scentmarked_proposals")
  .select("id,brand,perfume_name,duplicate_check_status,review_status,created_at")
  .eq("user_id",user.id).order("created_at",{ascending:false}).limit(30);
 if(error)return NextResponse.json({ok:false,message:"Unable to load saved proposals"},{status:503});
 return NextResponse.json({ok:true,proposals:data??[],scope:"signed_in_user",canApprove:false,canPublish:false},{headers:{"cache-control":"no-store"}});
}
