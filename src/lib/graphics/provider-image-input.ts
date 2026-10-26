/**
 * Prepare an ephemeral provider input from a previously approved review draft.
 * No provider invocation or storage; never log or return image bytes.
 */
import {prepareGraphicsJob,type GraphicsReviewDraft} from "./prepare-job";
import {retrieveTrustedReference} from "./trusted-reference-retrieval";
import {runtimeEnv} from "@/lib/runtime-env";
export type GraphicsProviderInput={status:"blocked"|"ready";reason:string;prompt?:string;imageBase64?:string;mimeType?:string;requiresOutputApproval:true;mayPublish:false};
const blocked=(reason:string):GraphicsProviderInput=>({status:"blocked",reason,requiresOutputApproval:true,mayPublish:false});
function toBase64(bytes:Uint8Array):string{
 // Avoid Node Buffer in Cloudflare Workers; process in bounded chunks.
 let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
export async function prepareProviderImageInput(draft:GraphicsReviewDraft):Promise<GraphicsProviderInput>{
 const proposal=prepareGraphicsJob(draft);
 if(proposal.status!=="prepared"||!proposal.referenceUrl||!proposal.prompt)return blocked(proposal.blockers.join("; ")||"Graphics preflight blocked.");
 const env=await runtimeEnv();
 if(!env.ATLAS_TRUSTED_IMAGE_ORIGIN)return blocked("Trusted image origin is not configured.");
 const result=await retrieveTrustedReference(proposal.referenceUrl,env.ATLAS_TRUSTED_IMAGE_ORIGIN);
 if(!result.inspection.ok||!result.bytes||!result.inspection.contentType)return blocked(result.inspection.reason);
 return {status:"ready",reason:"Reference image transport and format checked; identity and rights remain reviewer attestations.",prompt:proposal.prompt,imageBase64:toBase64(result.bytes),mimeType:result.inspection.contentType,requiresOutputApproval:true,mayPublish:false};
}
