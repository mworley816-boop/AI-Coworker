import type {SupabaseClient} from "@supabase/supabase-js";
import {generateScentmarkedGraphic,type GeneratedGraphic} from "./scentmarked-image-generation-provider";

/** A single bounded worker iteration. Requires a privileged Atlas Supabase client. */
export async function processNextScentmarkedGraphicJob(
 client:SupabaseClient,
 config:{enabled:boolean;apiKey:string;model?:string},
 generate:typeof generateScentmarkedGraphic=generateScentmarkedGraphic
):Promise<{ok:boolean;status:string;jobId?:string;graphic?:GeneratedGraphic}>{
 if(!config.enabled)return {ok:false,status:"WORKER_DISABLED"};
 const {data:jobs,error:lookupError}=await client.from("scentmarked_graphic_jobs").select("id,prompt,status").eq("status","queued").order("created_at",{ascending:true}).limit(1);
 if(lookupError)return {ok:false,status:"QUEUE_LOOKUP_FAILED"};
 const job=jobs?.[0];if(!job)return {ok:true,status:"QUEUE_EMPTY"};
 // Atomic compare-and-swap prevents two workers claiming the same queued job.
 const {data:claimed,error:claimError}=await client.from("scentmarked_graphic_jobs").update({status:"generating",updated_at:new Date().toISOString()}).eq("id",job.id).eq("status","queued").select("id").maybeSingle();
 if(claimError)return {ok:false,status:"CLAIM_FAILED"};
 if(!claimed)return {ok:true,status:"JOB_ALREADY_CLAIMED"};
 try{
  const graphic=await generate({jobId:job.id,prompt:job.prompt},{enabled:true,apiKey:config.apiKey,model:config.model});
  // Bytes intentionally returned to caller, not persisted in DB or uploaded.
  // Do not mark generated until an authenticated artifact store persists the output.
  const {error}=await client.from("scentmarked_graphic_jobs").update({status:"held",generation_job_id:graphic.providerJobId,error_code:"AWAITING_ARTIFACT_STORAGE",updated_at:new Date().toISOString()}).eq("id",job.id).eq("status","generating");
  if(error)return {ok:false,status:"RESULT_RECORD_FAILED",jobId:job.id};
  return {ok:true,status:"AWAITING_ARTIFACT_STORAGE",jobId:job.id,graphic};
 }catch{
  await client.from("scentmarked_graphic_jobs").update({status:"failed",error_code:"GENERATION_FAILED",updated_at:new Date().toISOString()}).eq("id",job.id).eq("status","generating");
  return {ok:false,status:"GENERATION_FAILED",jobId:job.id};
 }
}
