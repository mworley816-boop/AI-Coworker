import type {SupabaseClient} from "@supabase/supabase-js";
import type {GeneratedGraphic} from "./scentmarked-image-generation-provider";
export const ATLAS_GRAPHIC_ARTIFACT_BUCKET="atlas-graphic-artifacts";
/** Privileged Atlas-only holding storage, not Scentmarked public media. */
export async function persistGeneratedGraphic(client:SupabaseClient,jobId:string,graphic:GeneratedGraphic):Promise<{ok:boolean;path?:string;reason?:string}>{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId))return {ok:false,reason:"INVALID_JOB_ID"};
 const b=graphic.bytes;
 if(graphic.contentType!=="image/png"||b.byteLength<8||b.byteLength>5242880||b[0]!==137||b[1]!==80||b[2]!==78||b[3]!==71||b[4]!==13||b[5]!==10||b[6]!==26||b[7]!==10)return {ok:false,reason:"INVALID_GRAPHIC_FILE"};
 const path="generated/"+jobId+".png";
 const {error}=await client.storage.from(ATLAS_GRAPHIC_ARTIFACT_BUCKET).upload(path,b,{contentType:"image/png",upsert:false,cacheControl:"3600"});
 if(error)return {ok:false,reason:"ARTIFACT_STORAGE_FAILED"};
 return {ok:true,path};
}
