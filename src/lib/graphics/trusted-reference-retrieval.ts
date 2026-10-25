/**
 * Only fetch image bytes from explicitly configured, operator-controlled origins.
 * Generic URLs are not fetched: browser/Worker fetch cannot guarantee DNS pinning
 * against private-address resolution on arbitrary hosts.
 */
import {validateReferenceUrl} from "./reference-url-safety";
import {inspectImageResponse,type ImageInspection} from "./reference-image-inspection";
export type RetrievedImage={inspection:ImageInspection;bytes?:Uint8Array};
const failure=(reason:string):RetrievedImage=>({inspection:{ok:false,reason,requiresVisualReview:true,rightsVerified:false}});
export async function retrieveTrustedReference(url:string,configuredOrigin:string,fetcher:typeof fetch=fetch):Promise<RetrievedImage>{
 const check=validateReferenceUrl(url);
 if(!check.valid||!check.normalizedUrl)return failure(check.reason);
 let origin:URL,target:URL;
 try{origin=new URL(configuredOrigin);target=new URL(check.normalizedUrl);}catch{return failure("Trusted image origin is invalid.");}
 if(origin.protocol!=="https:"||origin.username||origin.password||origin.pathname!=="/"||origin.search||origin.hash||!validateReferenceUrl(origin.toString()).valid)return failure("Trusted image origin must be a public HTTPS origin.");
 if(target.origin!==origin.origin)return failure("Reference is outside the configured trusted image origin.");
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetcher(target.toString(),{method:"GET",redirect:"manual",credentials:"omit",cache:"no-store",signal:controller.signal,headers:{accept:"image/png,image/jpeg,image/webp"}});
  if(!response.ok||response.status>=300&&response.status<400)return failure("Reference fetch failed or attempted a redirect.");
  const size=response.headers.get("content-length");
  if(size!==null&&(!/^\d+$/.test(size)||Number(size)>8*1024*1024))return failure("Reference image exceeds size limit.");
  if(!response.body)return failure("Reference has no image body.");
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let total=0;
  while(true){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>8*1024*1024){await reader.cancel();return failure("Reference image exceeds size limit.");}chunks.push(part.value);}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const inspection=inspectImageResponse(response.headers.get("content-type"),size,bytes);
  return inspection.ok?{inspection,bytes}:{inspection};
 }catch{return failure("Reference fetch timed out or failed.");}
 finally{clearTimeout(timeout);}
}
