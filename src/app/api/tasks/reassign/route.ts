import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

export async function POST(request:Request){
 const s=await createServerSupabaseClient();
 if(!s)return NextResponse.json({ok:false,reason:"Workspace is not configured"},{status:503});
 const {data:{user}}=await s.auth.getUser();
 if(!user)return NextResponse.json({ok:false,reason:"Sign in is required"},{status:401});
 let body:{taskId?:unknown;coworkerId?:unknown};
 try{body=await request.json();}catch{return NextResponse.json({ok:false,reason:"Invalid request"},{status:400});}
 if(typeof body.taskId!=="string"||typeof body.coworkerId!=="string"||!body.taskId.trim()||!body.coworkerId.trim())return NextResponse.json({ok:false,reason:"Task and coworker are required"},{status:400});
 const {data:task,error:taskError}=await s.from("tasks").select("id,status,coworker_id").eq("id",body.taskId).eq("user_id",user.id).maybeSingle();
 if(taskError)return NextResponse.json({ok:false,reason:"Task lookup failed"},{status:500});
 if(!task)return NextResponse.json({ok:false,reason:"Task not found"},{status:404});
 if(task.status!=="queued")return NextResponse.json({ok:false,reason:"Only queued tasks can be reassigned"},{status:409});
 const {data:coworker,error:coworkerError}=await s.from("coworkers").select("id").eq("id",body.coworkerId).eq("user_id",user.id).maybeSingle();
 if(coworkerError)return NextResponse.json({ok:false,reason:"Coworker lookup failed"},{status:500});
 if(!coworker)return NextResponse.json({ok:false,reason:"Coworker not found"},{status:404});
 const {data:runs,error:runsError}=await s.from("runs").select("id,status").eq("task_id",task.id);
 if(runsError)return NextResponse.json({ok:false,reason:"Run lookup failed"},{status:500});
 if(!runs?.length||runs.some(r=>r.status!=="queued"))return NextResponse.json({ok:false,reason:"Reassignment requires all runs to be queued"},{status:409});
 const runIds=runs.map(r=>r.id);
 const {data:steps,error:stepsError}=await s.from("run_steps").select("id,status").in("run_id",runIds).neq("status","queued").limit(1);
 if(stepsError)return NextResponse.json({ok:false,reason:"Run step check failed"},{status:500});
 if(steps?.length)return NextResponse.json({ok:false,reason:"This task has already started processing"},{status:409});
 const {data:approvals,error:approvalError}=await s.from("approvals").select("id").in("run_id",runIds).limit(1);
 if(approvalError)return NextResponse.json({ok:false,reason:"Approval check failed"},{status:500});
 if(approvals?.length)return NextResponse.json({ok:false,reason:"Tasks with approval history cannot be reassigned"},{status:409});
 const update=await s.from("tasks").update({coworker_id:coworker.id}).eq("id",task.id).eq("user_id",user.id).eq("status","queued").eq("coworker_id",task.coworker_id).select("id").maybeSingle();
 if(update.error)return NextResponse.json({ok:false,reason:"Reassignment failed"},{status:500});
 if(!update.data)return NextResponse.json({ok:false,reason:"Task changed before reassignment"},{status:409});
 await s.from("activity_logs").insert({run_id:runIds[0],event_type:"task.reassigned",message:"Queued task assigned to another coworker.",metadata:{userId:user.id,taskId:task.id,fromCoworkerId:task.coworker_id,toCoworkerId:coworker.id}});
 return NextResponse.json({ok:true,taskId:task.id,coworkerId:coworker.id});
}
