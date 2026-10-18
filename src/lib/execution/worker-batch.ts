import type {SupabaseLike} from "@/lib/tools/authorize";
import {processNextQueuedRun} from "@/lib/execution/worker";
import {classifyWorkerOutcome} from "./worker-outcome";

export async function processQueuedRunBatch(supabase:SupabaseLike,workerId:string,maxRuns=5){
  const finalization=await supabase.rpc("finalize_completed_stalled_runs");
  if(finalization.error)return {ok:false as const,processed:0,results:[],reason:"Completed stalled runs could not be finalized"};
  const finalized=typeof finalization.data==="number"?finalization.data:0;
  const reports=await supabase.rpc("backfill_completed_run_reports");
  if(reports.error)return {ok:false as const,processed:0,finalized,results:[],reason:"Completed run reports could not be recovered"};
  const reportsRecovered=typeof reports.data==="number"?reports.data:0;
  const stalled=await supabase.rpc("reconcile_stalled_runs");
  if(stalled.error)return {ok:false as const,processed:0,finalized,reportsRecovered,results:[],reason:"Stalled runs could not be reconciled"};
  const stalledResult=Array.isArray(stalled.data)?stalled.data[0]:stalled.data;
  const requeued=Number(stalledResult?.requeued??0);
  const quarantined=Number(stalledResult?.quarantined??0);
  const recovery=await supabase.rpc("recover_expired_run_leases");
  if(recovery.error)return {ok:false as const,processed:0,finalized,reportsRecovered,results:[],reason:"Expired run leases could not be recovered"};
  const recovered=typeof recovery.data==="number"?recovery.data:0;
  const results:unknown[]=[];
  const failures:unknown[]=[];
  let succeeded=0;
  let deferred=0;
  const limit=Math.max(1,Math.min(maxRuns,20));
  for(let index=0;index<limit;index+=1){
    const result=await processNextQueuedRun(supabase,`${workerId}:${index}`);
    if(!result.ok){
      failures.push(result);
      if(!("runId" in result))return {ok:false as const,processed:results.length,succeeded,deferred,failed:failures.length,finalized,reportsRecovered,recovered,requeued,quarantined,results,failures,reason:"Worker could not claim the next run"};
      results.push(result);
      continue;
    }
    if("idle" in result&&result.idle)return {ok:failures.length===0,processed:results.length,succeeded,failed:failures.length,finalized,reportsRecovered,recovered,requeued,quarantined,idle:true as const,results,failures};
    results.push(result);
    if(classifyWorkerOutcome(result)==="completed")succeeded+=1;
    else deferred+=1;
  }
  return {ok:failures.length===0,processed:results.length,succeeded,failed:failures.length,finalized,reportsRecovered,recovered,requeued,quarantined,idle:false as const,results,failures};
}
