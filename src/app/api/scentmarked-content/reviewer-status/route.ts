import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

// The reviewer role is provisioned by a database administrator, not by this endpoint.
export async function GET(){
 const workspace=await createServerSupabaseClient();
 if(!workspace)return NextResponse.json({ok:false,message:"Atlas workspace is not configured"},{status:503});
 const {data:{user}}=await workspace.auth.getUser();
 if(!user)return NextResponse.json({ok:false,message:"Sign in required"},{status:401});
 // Authenticated users cannot query the reviewer table directly; use a
 // narrowly scoped SECURITY DEFINER function to check only their own role.
 const {data,error}=await workspace.rpc("is_scentmarked_reviewer");
 if(error)return NextResponse.json({ok:false,message:"Reviewer role check unavailable"},{status:503});
 return NextResponse.json({ok:true,isReviewer:data===true,canCreateDraft:false,canPublish:false},{headers:{"cache-control":"no-store"}});
}
