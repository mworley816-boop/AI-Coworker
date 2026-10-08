import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

export async function POST(){
 const supabase=await createServerSupabaseClient();
 if(!supabase)return NextResponse.json({error:"Supabase is not configured."},{status:503});
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in to request a repair."},{status:401});
 const {data:workspace,error}=await supabase.from("workspaces").select("id,resources").eq("user_id",user.id).eq("slug","scentmarked").maybeSingle();
 if(error)return NextResponse.json({error:"Could not load Scentmarked workspace."},{status:500});
 if(!workspace)return NextResponse.json({error:"Scentmarked workspace not found."},{status:404});
 const resources=(workspace.resources??{}) as Record<string,unknown>;
 const maintenance=(resources.maintenance??{}) as Record<string,unknown>;
 const events=Array.isArray(maintenance.websiteEvents)?maintenance.websiteEvents as Array<{type?:string;at?:string}>:[];
 if(events.at(-1)?.type!=="outage")return NextResponse.json({error:"No confirmed active outage to request a repair for."},{status:409});
 const existing=(maintenance.repairRequest??null) as {status?:string;outageAt?:string}|null;
 const outageAt=events.at(-1)?.at;
 if(existing?.status==="pending"&&existing.outageAt===outageAt)return NextResponse.json({status:"pending",alreadyExists:true});
 const repairRequest={status:"pending",outageAt,createdAt:new Date().toISOString(),kind:"investigate-outage",requiresApproval:true,scope:"read-only diagnostics",nextStep:"Review Cloudflare deployment and Worker logs before proposing a production change."};
 const {error:updateError}=await supabase.from("workspaces").update({resources:{...resources,maintenance:{...maintenance,repairRequest}}}).eq("id",workspace.id).eq("user_id",user.id);
 if(updateError)return NextResponse.json({error:"Could not save repair request."},{status:500});
 return NextResponse.json({status:"pending",request:repairRequest});
}
