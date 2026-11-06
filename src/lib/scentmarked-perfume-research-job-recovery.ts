import type {SupabaseClient} from "@supabase/supabase-js";
/** Hold abandoned research claims for manual inspection; never retry or publish. */
export async function holdStalePerfumeResearchJobs(client:SupabaseClient,olderThanMinutes=30,limit=10){
 if(!Number.isSafeInteger(olderThanMinutes)||olderThanMinutes<15||olderThanMinutes>1440)return {ok:false,status:"INVALID_AGE",held:0};
 if(!Number.isSafeInteger(limit)||limit<1||limit>25)return {ok:false,status:"INVALID_LIMIT",held:0};
 const cutoff=new Date(Date.now()-olderThanMinutes*60000).toISOString();
 const {data,error}=await client.from("atlas_perfume_research_jobs").select("id,owner_user_id").eq("status","researching").lt("updated_at",cutoff).order("updated_at",{ascending:true}).limit(limit);
 if(error)return {ok:false,status:"QUEUE_LOOKUP_FAILED",held:0};
 let held=0;
 for(const job of data??[]){
  const {data:updated,error:updateError}=await client.from("atlas_perfume_research_jobs").update({status:"held",error_code:"STALE_RESEARCH_REVIEW_REQUIRED",updated_at:new Date().toISOString()}).eq("id",job.id).eq("owner_user_id",job.owner_user_id).eq("status","researching").lt("updated_at",cutoff).select("id").maybeSingle();
  if(updateError)return {ok:false,status:"RECOVERY_UPDATE_FAILED",held};
  if(updated)held++;
 }
 return {ok:true,status:"STALE_JOBS_HELD",held};
}
