import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

/** Recover a read-only run whose execution request ended after every step completed. */
export async function POST(request:Request){
  const supabase=await createServerSupabaseClient();
  if(!supabase)return NextResponse.json({ok:false,reason:"Supabase is not configured"},{status:503});
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({ok:false,reason:"Sign in is required"},{status:401});
  let body:{runId?:unknown};
  try{body=await request.json();}catch{return NextResponse.json({ok:false,reason:"Invalid JSON"},{status:400});}
  if(typeof body.runId!=="string"||!/^[0-9a-f-]{36}$/i.test(body.runId))return NextResponse.json({ok:false,reason:"Invalid run ID"},{status:400});
  const {data:run,error}=await supabase.from("runs").select("id,status,task_id,lease_expires_at,tasks!inner(user_id)").eq("id",body.runId).eq("tasks.user_id",user.id).maybeSingle();
  if(error||!run)return NextResponse.json({ok:false,reason:"Run not found"},{status:404});
  if(run.status==="completed")return NextResponse.json({ok:true,status:"completed"});
  if(!["queued","running"].includes(run.status))return NextResponse.json({ok:false,reason:"Run cannot be recovered in its current state"},{status:409});
  if(run.status==="running"&&(!run.lease_expires_at||new Date(run.lease_expires_at).getTime()>Date.now()))return NextResponse.json({ok:false,reason:"Run may still be executing"},{status:409});
  const {data:steps,error:stepsError}=await supabase.from("run_steps").select("position,kind,title,status,output").eq("run_id",run.id).order("position");
  if(stepsError||!steps?.length||steps.some(step=>step.status!=="completed"))return NextResponse.json({ok:false,reason:"Not every step has completed"},{status:409});
  const {data:approvals,error:approvalError}=await supabase.from("approvals").select("id").eq("run_id",run.id).in("status",["pending","approved","executing","uncertain"]).limit(1);
  if(approvalError||approvals?.length)return NextResponse.json({ok:false,reason:"Run has unresolved approvals"},{status:409});
  const {data:completed,error:completeError}=await supabase.from("runs").update({status:"completed",finished_at:new Date().toISOString(),lease_owner:null,lease_expires_at:null}).eq("id",run.id).eq("status",run.status).select("id").maybeSingle();
  if(completeError)return NextResponse.json({ok:false,reason:"Could not finalize run"},{status:500});
  if(!completed)return NextResponse.json({ok:false,reason:"Run state changed; refresh and retry"},{status:409});
  const taskSync=await supabase.from("tasks").update({status:"completed"}).eq("id",run.task_id);
  const draft=steps.find(step=>step.kind==="draft");
  const research=steps.find(step=>step.kind==="research");
  const report={summary:`Atlas completed ${steps.length} of ${steps.length} planned steps.`,deliverable:draft?.output?.text??null,sources:Array.isArray(research?.output?.sources)?research.output.sources:[],completedSteps:steps.map(step=>({position:step.position,title:step.title,message:step.output?.message??null})),finishedAt:new Date().toISOString()};
  await supabase.from("activity_logs").insert([{run_id:run.id,event_type:"run.completed",message:"Recovered completed run after interrupted execution."},{run_id:run.id,event_type:"run.report",message:report.summary,metadata:report},...(taskSync.error?[{run_id:run.id,event_type:"run.reconciliation_required",message:"Recovered run but task status synchronization failed."}]:[])]);
  return NextResponse.json({ok:true,status:"completed",report});
}
