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
 const {data:changed,error:changeError}=await s.rpc("reassign_queued_task_atomic",{p_task_id:task.id,p_coworker_id:coworker.id});
 if(changeError)return NextResponse.json({ok:false,reason:"Atomic reassignment unavailable. Apply the database migration before using this feature."},{status:503});
 if(!changed)return NextResponse.json({ok:false,reason:"Task is no longer eligible for reassignment. Refresh tasks."},{status:409});
 const {data:firstRun}=await s.from("runs").select("id").eq("task_id",task.id).order("created_at",{ascending:true}).limit(1).maybeSingle();
 if(firstRun)await s.from("activity_logs").insert({run_id:firstRun.id,event_type:"task.reassigned",message:"Queued task assigned to another coworker.",metadata:{userId:user.id,taskId:task.id,fromCoworkerId:task.coworker_id,toCoworkerId:coworker.id}});
 return NextResponse.json({ok:true,taskId:task.id,coworkerId:coworker.id});
}
