import type {SupabaseLike} from "@/lib/tools/authorize";
import {processNextQueuedRun} from "@/lib/execution/worker";

export async function processQueuedRunBatch(supabase:SupabaseLike,workerId:string,maxRuns=5){
  const results:unknown[]=[];
  const limit=Math.max(1,Math.min(maxRuns,20));
  for(let index=0;index<limit;index+=1){
    const result=await processNextQueuedRun(supabase,`${workerId}:${index}`);
    if(!result.ok)return {ok:false as const,processed:results.length,results,reason:"Worker batch stopped after a run failed",failure:result};
    if("idle" in result&&result.idle)return {ok:true as const,processed:results.length,idle:true as const,results};
    results.push(result);
  }
  return {ok:true as const,processed:results.length,idle:false as const,results};
}
