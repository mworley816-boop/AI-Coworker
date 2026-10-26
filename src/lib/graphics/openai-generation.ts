import {runtimeEnv} from "@/lib/runtime-env";
import {prepareProviderImageInput} from "./provider-image-input";
import type {GraphicsReviewDraft} from "./prepare-job";
export type GenerationResult={ok:boolean;reason:string;imageDataUrl?:string;requiresOutputApproval:true;mayPublish:false};
const fail=(reason:string):GenerationResult=>({ok:false,reason,requiresOutputApproval:true,mayPublish:false});
function decodeBase64(encoded:string):Uint8Array{
 const binary=atob(encoded);const bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return bytes;
}
/** Explicit, server-side, one-shot generation. Never persists or publishes output. */
export async function generateGraphicsPreview(draft:GraphicsReviewDraft):Promise<GenerationResult>{
 const env=await runtimeEnv();
 if(env.ATLAS_GRAPHICS_PROVIDER!=="openai"||!env.OPENAI_API_KEY)return fail("OpenAI graphics provider is not configured.");
 if(env.ATLAS_GRAPHICS_GENERATION_ENABLED!=="true")return fail("Graphics generation is disabled by configuration.");
 const input=await prepareProviderImageInput(draft);
 if(input.status!=="ready"||!input.imageBase64||!input.mimeType||!input.prompt)return fail(input.reason);
 const ext=input.mimeType==="image/png"?"png":input.mimeType==="image/webp"?"webp":"jpg";
 const form=new FormData();
 form.set("model","gpt-image-1");
 form.set("prompt",input.prompt+"\nUse the supplied bottle photograph as the primary identity reference. Preserve label text and bottle geometry as closely as possible. Output is an unapproved preview only.");
 form.set("size","1024x1024");
 form.set("image",new Blob([decodeBase64(input.imageBase64)],{type:input.mimeType}),"reference."+ext);
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),90000);
 try{
  const response=await fetch("https://api.openai.com/v1/images/edits",{method:"POST",headers:{Authorization:"Bearer "+env.OPENAI_API_KEY},body:form,signal:controller.signal,cache:"no-store"});
  if(!response.ok)return fail("Image provider rejected the generation request (HTTP "+response.status+").");
  const payload=await response.json() as {data?:Array<{b64_json?:string}>};
  const b64=payload.data?.[0]?.b64_json;
  if(!b64||!/^[A-Za-z0-9+/=]+$/.test(b64)||b64.length>16*1024*1024)return fail("Image provider returned no usable preview.");
  return {ok:true,reason:"Preview generated; review required before any further use.",imageDataUrl:"data:image/png;base64,"+b64,requiresOutputApproval:true,mayPublish:false};
 }catch{return fail("Image generation timed out or failed.");}
 finally{clearTimeout(timeout);}
}
