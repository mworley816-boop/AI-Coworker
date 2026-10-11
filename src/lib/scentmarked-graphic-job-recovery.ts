import type {SupabaseClient} from "@supabase/supabase-js";
/** Conservatively hold abandoned jobs. Never regenerate or delete artifacts. */
export async function holdStaleGraphicJobs(client:SupabaseClient,olderThanMinutes=30,limit=10){
 if(!Number.isSafeInteger(olderThanMinutes)||olderThanMinutes<15||olderThanMinutes>1440)return {ok:false,status:"INVALID_AGE",held:0};
 if(!Number.isSafeInteger(limit)||limit<1||limit>25)return {ok:false,status:"INVALID_LIMIT",held:0};
 const cutoff=new Date(Date.now()-olderThanMinutes*60000).toISOString();
 const {data,error}=await client.from("scentmarked_graphic_jobs").select("id").eq("status","generating").lt("updated_at",cutoff).order("updated_at",{ascending:true}).limit(limit);
 if(error)return {ok:false,status:"QUEUE_LOOKUP_FAILED",held:0};
 let held=0;
 for(const job of data??[]){
  const {data:updated,error:updateError}=await client.from("scentmarked_graphic_jobs").update({status:"held",error_code:"STALE_GENERATION_REVIEW_REQUIRED",updated_at:new Date().toISOString()}).eq("id",job.id).eq("status","generating").lt("updated_at",cutoff).select("id").maybeSingle();
  if(updateError)return {ok:false,status:"RECOVERY_UPDATE_FAILED",held};
  if(updated)held++;
 }
 return {ok:true,status:"STALE_JOBS_HELD",held};
}
