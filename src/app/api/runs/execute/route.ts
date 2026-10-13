import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

export async function POST(request:Request){
 const supabase=await createServerSupabaseClient();
 if(!supabase)return NextResponse.json({ok:false,reason:"Supabase is not configured"},{status:503});
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({ok:false,reason:"Sign in is required"},{status:401});
 let body:{runId?:unknown};
 try{body=await request.json();}catch{return NextResponse.json({ok:false,reason:"Invalid request"},{status:400});}
 if(typeof body.runId!=="string")return NextResponse.json({ok:false,reason:"runId is required"},{status:400});
 const {data:run,error}=await supabase.from("runs").select("id,status,tasks!inner(user_id)").eq("id",body.runId).eq("tasks.user_id",user.id).maybeSingle();
 if(error)return NextResponse.json({ok:false,reason:"Run lookup failed"},{status:500});
 if(!run)return NextResponse.json({ok:false,reason:"Run not found"},{status:404});
 if(run.status==="paused")return NextResponse.json({ok:false,reason:"Run is paused"},{status:409});
 if(run.status==="completed"||run.status==="cancelled"||run.status==="failed")return NextResponse.json({ok:false,reason:"Run is "+run.status},{status:409});
 if(run.status==="running")return NextResponse.json({ok:true,runId:run.id,status:"running"});
 if(run.status!=="queued")return NextResponse.json({ok:false,reason:"Run is not queued"},{status:409});
 await supabase.from("activity_logs").insert({run_id:run.id,event_type:"run.execution_requested",message:"Run queued for background processing.",metadata:{userId:user.id}});
 return NextResponse.json({ok:true,runId:run.id,status:"queued"},{status:202});
}
