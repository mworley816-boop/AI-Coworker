import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

// Only provisioned reviewers may inspect the pending queue.
export async function GET(){
 const workspace=await createServerSupabaseClient();
 if(!workspace)return NextResponse.json({ok:false,message:"Atlas workspace is not configured"},{status:503});
 const {data:{user}}=await workspace.auth.getUser();
 if(!user)return NextResponse.json({ok:false,message:"Sign in required"},{status:401});
 const {data,error}=await workspace.rpc("list_pending_scentmarked_proposals",{p_limit:30});
 if(error)return NextResponse.json({ok:false,message:error.code==="42501"?"Reviewer authorization required":"Unable to load pending review queue"},{status:error.code==="42501"?403:503});
 return NextResponse.json({ok:true,proposals:data??[],canPublish:false,canCreateDraft:false},{headers:{"cache-control":"no-store"}});
}
