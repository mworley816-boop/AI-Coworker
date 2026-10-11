import type {SupabaseClient} from "@supabase/supabase-js";
import {planGraphicGenerationJobs,type GraphicJobInput} from "./scentmarked-graphic-generation-jobs";
/** Enqueue only. Provider execution and privileged status transitions are separate. */
export async function enqueueScentmarkedGraphicJobs(client:SupabaseClient,ownerUserId:string,inputs:GraphicJobInput[],limit=10){
 if(!ownerUserId.trim())return {ok:false,reason:"OWNER_REQUIRED",queued:0,held:[]};
 const plan=planGraphicGenerationJobs(inputs,limit);
 if(plan.queued.length===0)return {ok:true,queued:0,held:plan.held};
 const rows=plan.queued.map(job=>({owner_user_id:ownerUserId,perfume_id:job.perfumeId,brand:job.brand,perfume_name:job.perfumeName,graphic_format:job.format,prompt:job.prompt,status:"queued",rights_cleared:false,identity_verified:false}));
 const {error}=await client.from("scentmarked_graphic_jobs").insert(rows);
 if(error)return {ok:false,reason:"GRAPHIC_JOB_QUEUE_FAILED",queued:0,held:plan.held};
 return {ok:true,queued:rows.length,held:plan.held};
}
