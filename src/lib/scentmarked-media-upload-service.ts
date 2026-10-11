import {validateMediaUpload,type MediaUploadRequest} from "./scentmarked-media-preflight";

export type MediaUploadResult={ok:boolean;reason?:string;path?:string};
export type MediaUploadTransport=(args:{bucket:string;path:string;contentType:string;bytes:Uint8Array})=>Promise<{path:string}>;
/** Uploads only after explicit activation and validation. Caller must supply an authenticated storage transport. */
export async function uploadValidatedScentmarkedMedia(
 request:MediaUploadRequest,bytes:Uint8Array,transport:MediaUploadTransport,
 options:{enabled:boolean;dryRun?:boolean}={enabled:false,dryRun:true}
):Promise<MediaUploadResult>{
 if(!options.enabled)return {ok:false,reason:"MEDIA_AUTOMATION_DISABLED"};
 const validation=validateMediaUpload(request);
 if(!validation.ok)return {ok:false,reason:validation.reasons.join(",")};
 if(bytes.byteLength!==request.byteLength)return {ok:false,reason:"MEDIA_SIZE_MISMATCH"};
 if(options.dryRun!==false)return {ok:false,reason:"DRY_RUN_NO_UPLOAD"};
 try{
  const result=await transport({bucket:request.bucket,path:request.path,contentType:request.contentType,bytes});
  if(result.path!==request.path)return {ok:false,reason:"UNEXPECTED_UPLOAD_PATH"};
  return {ok:true,path:result.path};
 }catch{return {ok:false,reason:"MEDIA_UPLOAD_FAILED"};}
}
