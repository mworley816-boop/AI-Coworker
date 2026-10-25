import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
const decisions=["needs_follow_up","reviewed","rejected"] as const;
type Decision=typeof decisions[number];
export async function POST(request:Request){
 const s=await createServerSupabaseClient();
 if(!s)return NextResponse.json({ok:false,reason:"Supabase is not configured"},{status:503});
 const {data:{user}}=await s.auth.getUser();
 if(!user)return NextResponse.json({ok:false,reason:"Sign in required"},{status:401});
 let body:unknown;try{body=await request.json();}catch{return NextResponse.json({ok:false,reason:"Invalid JSON"},{status:400});}
 if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({ok:false,reason:"Invalid request"},{status:400});
 const {runId,stepId,claim,decision}=body as Record<string,unknown>;
 if(typeof runId!=="string"||!/^[0-9a-f-]{36}$/i.test(runId)||typeof stepId!=="string"||!/^[0-9a-f-]{36}$/i.test(stepId)||typeof claim!=="string"||!claim.trim()||claim.length>250||!decisions.includes(decision as Decision))return NextResponse.json({ok:false,reason:"Invalid review details"},{status:400});
 const owned=await s.from("runs").select("id,tasks!inner(user_id)").eq("id",runId).eq("tasks.user_id",user.id).maybeSingle();
 if(owned.error)return NextResponse.json({ok:false,reason:"Could not verify run ownership"},{status:500});
 if(!owned.data)return NextResponse.json({ok:false,reason:"Run not found"},{status:404});
 const step=await s.from("run_steps").select("id,output").eq("run_id",runId).eq("id",stepId).maybeSingle();
 if(step.error)return NextResponse.json({ok:false,reason:"Could not verify research step"},{status:500});
 if(!step.data)return NextResponse.json({ok:false,reason:"Step not found"},{status:404});
 // Review decisions are audit events only. They never authorize catalog writes.
 const audit=await s.from("activity_logs").insert({run_id:runId,event_type:"research.claim_review_decision",message:"User recorded a research claim review decision.",metadata:{userId:user.id,stepId,claim:claim.trim(),decision}});
 if(audit.error)return NextResponse.json({ok:false,reason:"Could not save review decision"},{status:500});
 return NextResponse.json({ok:true,decision});
}
