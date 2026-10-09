import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

type Decision="approve"|"reject";
export async function POST(request:Request){
 const supabase=await createServerSupabaseClient();
 if(!supabase)return NextResponse.json({error:"Supabase is not configured."},{status:503});
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in is required."},{status:401});
 let body:{decision?:unknown;reason?:unknown;proposal?:unknown};
 try{body=await request.json();}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
 if(body.decision!=="approve"&&body.decision!=="reject")return NextResponse.json({error:"Invalid decision."},{status:400});
 const decision=body.decision as Decision;
 const reason=typeof body.reason==="string"?body.reason.trim():"";
 const proposal=typeof body.proposal==="string"?body.proposal.trim():"";
 if(proposal.length<20||proposal.length>2000)return NextResponse.json({error:"A specific repair proposal between 20 and 2000 characters is required."},{status:400});
 if(decision==="approve"&&(/\[[^\]]*(?:specify|confirm|todo|tbd)[^\]]*\]/i.test(proposal)||!/proposed repair\s*:/i.test(proposal)||!/rollback plan\s*:/i.test(proposal)))return NextResponse.json({error:"Approval requires completed Proposed repair and Rollback plan sections without unfinished placeholders."},{status:400});
 if(decision==="approve"){const repair=proposal.match(/proposed repair\s*:\s*([\s\S]*?)(?=rollback plan\s*:|$)/i)?.[1]?.trim()??"";const rollback=proposal.match(/rollback plan\s*:\s*([\s\S]*)/i)?.[1]?.trim()??"";if(repair.length<30||rollback.length<30)return NextResponse.json({error:"Approval requires at least 30 characters of substantive detail in both the Proposed repair and Rollback plan sections."},{status:400});}
 if(reason.length<10||reason.length>2000)return NextResponse.json({error:"Provide a reason between 10 and 2000 characters."},{status:400});
 const {data:workspace,error}=await supabase.from("workspaces").select("id,resources").eq("slug","scentmarked").eq("user_id",user.id).maybeSingle();
 if(error)return NextResponse.json({error:"Workspace lookup failed."},{status:500});
 if(!workspace)return NextResponse.json({error:"Scentmarked workspace not found."},{status:404});
 const resources=(workspace.resources??{}) as Record<string,unknown>;
 const maintenance=(resources.maintenance??{}) as Record<string,unknown>;
 const repair=(maintenance.repairRequest??null) as {runId?:string;outageAt?:string}|null;
 if(!repair?.runId)return NextResponse.json({error:"No linked investigation."},{status:409});
 const {data:run,error:runError}=await supabase.from("runs").select("id,status,task_id").eq("id",repair.runId).maybeSingle();
 if(runError||!run)return NextResponse.json({error:"Investigation run unavailable."},{status:409});
 const {data:ownedTask,error:taskError}=await supabase.from("tasks").select("id").eq("id",run.task_id).eq("user_id",user.id).maybeSingle();
 if(taskError||!ownedTask)return NextResponse.json({error:"Investigation does not belong to this user."},{status:403});
 if(run.status!=="completed")return NextResponse.json({error:"Investigation must be completed before recording a decision."},{status:409});
 const {data:steps,error:stepsError}=await supabase.from("run_steps").select("status,output").eq("run_id",run.id);
 if(stepsError)return NextResponse.json({error:"Investigation evidence unavailable."},{status:500});
 if(decision==="approve"&&(!steps?.some(step=>step.status==="completed"&&step.output!=null&&((typeof step.output==="string"?step.output:JSON.stringify(step.output))??"").trim().length>=30)||steps.some(step=>step.status==="failed")))return NextResponse.json({error:"Cannot approve without substantive completed diagnostic evidence (at least 30 characters) and no failed steps."},{status:409});
 const prior=(maintenance.repairDecision??null) as {runId?:string}|null;
 if(prior?.runId===run.id)return NextResponse.json({error:"A decision is already recorded for this investigation."},{status:409});
 const recordedAt=new Date().toISOString();
 const repairDecision={runId:run.id,outageAt:repair.outageAt??null,decision,reason,proposal,recordedAt,recordedBy:user.id,executionAuthorized:false,executionStatus:"not_requested",approvalScope:"proposal_review_only"};
 const updated=await supabase.from("workspaces").update({resources:{...resources,maintenance:{...maintenance,repairDecision}}}).eq("id",workspace.id).eq("user_id",user.id).eq("resources",workspace.resources).select("id");
 if(updated.error)return NextResponse.json({error:"Could not save repair decision. Workspace changed during review; reload and retry."},{status:409});
 if(!updated.data?.length)return NextResponse.json({error:"Workspace changed while recording the decision. Reload to see the current review state before trying again."},{status:409});
 const {error:auditError}=await supabase.from("activity_logs").insert({run_id:run.id,event_type:"scentmarked.repair_decision",message:`Repair proposal ${decision}d for review only; no execution authorized.`,metadata:{userId:user.id,runId:run.id,outageAt:repair.outageAt??null,decision,reason,proposal,recordedAt,executionAuthorized:false,executionStatus:"not_requested",approvalScope:"proposal_review_only"}});
 if(auditError){console.error("Repair decision audit insertion failed",{workspaceId:workspace.id,runId:run.id,recordedAt,auditCode:auditError.code??"unknown"});return NextResponse.json({error:"Repair review was saved, but audit logging failed. Do not retry the decision; contact an administrator to reconcile the audit record.",decisionSaved:true,auditLogged:false,investigationRunId:run.id,recordedAt},{status:500});}
 return NextResponse.json({ok:true,repairDecision,auditLogged:true});
}
