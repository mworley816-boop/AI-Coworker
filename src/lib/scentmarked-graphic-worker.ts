import type {SupabaseClient} from "@supabase/supabase-js";
import {generateScentmarkedGraphic,type GeneratedGraphic} from "./scentmarked-image-generation-provider";
import {persistGeneratedGraphic} from "./scentmarked-graphic-artifact-storage";

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
  const stored=await persistGeneratedGraphic(client,job.id,graphic);
  if(!stored.ok){await client.from("scentmarked_graphic_jobs").update({status:"held",error_code:stored.reason??"ARTIFACT_STORAGE_FAILED",updated_at:new Date().toISOString()}).eq("id",job.id).eq("status","generating");return {ok:false,status:stored.reason??"ARTIFACT_STORAGE_FAILED",jobId:job.id};}
  const {error}=await client.from("scentmarked_graphic_jobs").update({status:"generated",generation_job_id:graphic.providerJobId,output_storage_path:stored.path,error_code:null,updated_at:new Date().toISOString()}).eq("id",job.id).eq("status","generating");
  if(error)return {ok:false,status:"RESULT_RECORD_FAILED",jobId:job.id};
  return {ok:true,status:"GENERATED_PRIVATE_ARTIFACT",jobId:job.id};
 }catch{
  await client.from("scentmarked_graphic_jobs").update({status:"failed",error_code:"GENERATION_FAILED",updated_at:new Date().toISOString()}).eq("id",job.id).eq("status","generating");
  return {ok:false,status:"GENERATION_FAILED",jobId:job.id};
 }
}
