import type {SupabaseLike} from "@/lib/tools/authorize";
import {processNextQueuedRun} from "@/lib/execution/worker";

export async function processQueuedRunBatch(supabase:SupabaseLike,workerId:string,maxRuns=5){
  const recovery=await supabase.rpc("recover_expired_run_leases");
  if(recovery.error)return {ok:false as const,processed:0,results:[],reason:"Expired run leases could not be recovered"};
  const recovered=typeof recovery.data==="number"?recovery.data:0;
  const results:unknown[]=[];
  const limit=Math.max(1,Math.min(maxRuns,20));
  for(let index=0;index<limit;index+=1){
    const result=await processNextQueuedRun(supabase,`${workerId}:${index}`);
    if(!result.ok)return {ok:false as const,processed:results.length,recovered,results,reason:"Worker batch stopped after a run failed",failure:result};
    if("idle" in result&&result.idle)return {ok:true as const,processed:results.length,recovered,idle:true as const,results};
    results.push(result);
  }
  return {ok:true as const,processed:results.length,recovered,idle:false as const,results};
}
