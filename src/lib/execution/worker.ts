import type {SupabaseLike} from "@/lib/tools/authorize";
import {renewRunLease,releaseRunLease} from "@/lib/execution/lease";
import {executeRunWithClient} from "@/lib/execution/run-core";

export async function processNextQueuedRun(supabase:SupabaseLike,workerId:string){
  const {data,error}=await supabase.rpc("claim_next_queued_run",{p_owner:workerId,p_lease_seconds:60});
  if(error)return {ok:false as const,reason:"Queued run could not be claimed"};
  const run=Array.isArray(data)?data[0]:data;
  if(!run)return {ok:true as const,idle:true as const};
  let heartbeat:ReturnType<typeof setInterval>|undefined;
  let leaseLost=false;
  try{
    heartbeat=setInterval(()=>{void renewRunLease(supabase,run.id,workerId).then(async renewed=>{if(!renewed.ok){leaseLost=true;await supabase.from("activity_logs").insert({run_id:run.id,event_type:"run.lease_renewal_failed",message:"Background worker lost its execution lease heartbeat.",metadata:{workerId}});}});},30_000);
    await supabase.from("activity_logs").insert({run_id:run.id,event_type:"run.worker_claimed",message:"Background worker atomically claimed queued run.",metadata:{workerId}});
    const result=await executeRunWithClient(run.id,supabase);
    if(leaseLost)return {ok:false as const,runId:run.id,reason:"Worker execution lease was lost",result};
    return {ok:result.ok,runId:run.id,result};
  }finally{
    if(heartbeat)clearInterval(heartbeat);
    const released=await releaseRunLease(supabase,run.id,workerId);
    if(!released.ok)await supabase.from("activity_logs").insert({run_id:run.id,event_type:"run.reconciliation_required",message:"Background worker finished but its execution lease could not be released.",metadata:{workerId}});
  }
}
