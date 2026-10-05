import type {SupabaseLike} from "@/lib/tools/authorize";
import {claimRunLease,renewRunLease,releaseRunLease} from "@/lib/execution/lease";
import {executeRunWithClient} from "@/lib/execution/run-core";

export async function processNextQueuedRun(supabase:SupabaseLike,workerId:string){
  const now=new Date().toISOString();
  const {data:runs,error}=await supabase.from("runs").select("id,status,lease_owner,lease_expires_at").eq("status","queued").order("created_at",{ascending:true}).limit(10);
  if(error)return {ok:false as const,reason:"Queued runs could not be loaded"};
  for(const run of runs??[]){
    const active=typeof run.lease_expires_at==="string"&&run.lease_expires_at>now;
    if(active&&run.lease_owner!==workerId)continue;
    const lease=await claimRunLease(supabase,run.id,workerId);
    if(!lease.ok)continue;
    let heartbeat:ReturnType<typeof setInterval>|undefined;
    try{
      heartbeat=setInterval(()=>{void renewRunLease(supabase,run.id,workerId);},30_000);
      await supabase.from("activity_logs").insert({run_id:run.id,event_type:"run.worker_claimed",message:"Background worker claimed queued run.",metadata:{workerId}});
      const result=await executeRunWithClient(run.id,supabase);
      return {ok:result.ok,runId:run.id,result};
    }finally{
      if(heartbeat)clearInterval(heartbeat);
      const released=await releaseRunLease(supabase,run.id,workerId);
      if(!released.ok)await supabase.from("activity_logs").insert({run_id:run.id,event_type:"run.reconciliation_required",message:"Background worker finished but its execution lease could not be released.",metadata:{workerId}});
    }
  }
  return {ok:true as const,idle:true as const};
}
