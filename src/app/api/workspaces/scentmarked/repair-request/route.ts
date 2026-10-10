import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {planGoal} from "@/lib/planner";

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
 if(existing?.status==="pending"&&existing.outageAt===outageAt)return NextResponse.json({status:"pending",alreadyExists:true,taskId:(existing as {taskId?:string}).taskId,runId:(existing as {runId?:string}).runId});
 const {data:coworker,error:coworkerError}=await supabase.from("coworkers").select("id").eq("user_id",user.id).eq("name","Atlas").maybeSingle();
 if(coworkerError)return NextResponse.json({error:"Could not find Atlas coworker."},{status:500});
 if(!coworker)return NextResponse.json({error:"Create Atlas before requesting an investigation."},{status:409});
 const goal="Investigate the Scentmarked website outage through read-only GitHub repository research. Examine recent commits and relevant source code, summarize likely causes, and recommend next steps. Diagnostic report only; no external actions.";
 const steps=planGoal(goal);
 if(steps.some(step=>step.actionToolId||step.requiresApproval))return NextResponse.json({error:"Investigation plan must be read-only."},{status:500});
 const task=await supabase.from("tasks").insert({user_id:user.id,coworker_id:coworker.id,goal,status:"queued"}).select("id").single();
 if(task.error)return NextResponse.json({error:"Could not create investigation task."},{status:500});
 const run=await supabase.from("runs").insert({task_id:task.data.id,status:"queued"}).select("id").single();
 if(run.error){await supabase.from("tasks").delete().eq("id",task.data.id).eq("user_id",user.id);return NextResponse.json({error:"Could not create investigation run."},{status:500});}
 const rows=steps.map(step=>({run_id:run.data.id,position:step.position,kind:step.kind,title:step.title,status:"queued",input:{requiresApproval:false,toolId:step.toolId,actionToolId:null,...(step.toolId==="github.read"?{repository:"mworley816-boop/Scentmarked",resource:"main"}:{})}}));
 const inserted=await supabase.from("run_steps").insert(rows);
 if(inserted.error){await supabase.from("tasks").delete().eq("id",task.data.id).eq("user_id",user.id);return NextResponse.json({error:"Could not create investigation steps."},{status:500});}
 const repairRequest={status:"pending",outageAt,createdAt:new Date().toISOString(),kind:"investigate-outage",requiresApproval:false,scope:"read-only diagnostics",taskId:task.data.id,runId:run.data.id,nextStep:"Run read-only investigation; request separate approval before any production change."};
 const {error:updateError}=await supabase.from("workspaces").update({resources:{...resources,maintenance:{...maintenance,repairRequest}}}).eq("id",workspace.id).eq("user_id",user.id);
 if(updateError){await supabase.from("tasks").delete().eq("id",task.data.id).eq("user_id",user.id);return NextResponse.json({error:"Could not save repair request."},{status:500});}
 return NextResponse.json({status:"pending",request:repairRequest});
}
