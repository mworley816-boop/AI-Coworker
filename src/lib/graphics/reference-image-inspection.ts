import {validateReferenceUrl} from "./reference-url-safety";
import {runtimeEnv} from "@/lib/runtime-env";
import {retrieveTrustedReference} from "./trusted-reference-retrieval";
/**
 * Inspect a remote reference without returning or persisting its bytes.
 * This is a transport/media check, NOT product identity, authenticity or rights verification.
 */
export type ImageInspection={ok:boolean;reason:string;contentType?:string;byteLength?:number;requiresVisualReview:true;rightsVerified:false};
const maxBytes=8*1024*1024;
const allowedTypes=new Set(["image/jpeg","image/png","image/webp"]);
const fail=(reason:string):ImageInspection=>({ok:false,reason,requiresVisualReview:true,rightsVerified:false});
export async function inspectReferenceImage(referenceUrl:string):Promise<ImageInspection>{
 const check=validateReferenceUrl(referenceUrl);if(!check.valid||!check.normalizedUrl)return fail(check.reason);
 const env=await runtimeEnv();
 if(!env.ATLAS_TRUSTED_IMAGE_ORIGIN)return fail("Trusted image origin is not configured; arbitrary external image URLs cannot be fetched.");
 const result=await retrieveTrustedReference(check.normalizedUrl,env.ATLAS_TRUSTED_IMAGE_ORIGIN);
 return result.inspection;
}
export function inspectImageResponse(contentType:string|null,contentLength:string|null,bytes:Uint8Array):ImageInspection{
 const mime=(contentType??"").split(";")[0].trim().toLowerCase();
 if(!allowedTypes.has(mime))return fail("Unsupported image content type.");
 if(contentLength!==null&&(!/^\d+$/.test(contentLength)||Number(contentLength)>maxBytes))return fail("Image content length is invalid or too large.");
 if(bytes.length===0||bytes.length>maxBytes)return fail("Image is empty or exceeds size limit.");
 const jpeg=bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
 const png=bytes.length>=8&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b);
 const webp=bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP";
 if(!(mime==="image/jpeg"&&jpeg||mime==="image/png"&&png||mime==="image/webp"&&webp))return fail("Image signature does not match its declared type.");
 return {ok:true,reason:"Image bytes match declared type and size limits. Visual identity and licensing remain unverified.",contentType:mime,byteLength:bytes.length,requiresVisualReview:true,rightsVerified:false};
}
