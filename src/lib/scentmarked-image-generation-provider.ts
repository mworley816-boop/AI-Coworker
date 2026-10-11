/** Server-only image provider adapter. Does not persist or upload images. */
export type GeneratedGraphic={bytes:Uint8Array;contentType:"image/png";providerJobId:string};
export async function generateScentmarkedGraphic(input:{prompt:string;jobId:string},config:{apiKey:string;enabled:boolean;model?:string;endpoint?:string},request:typeof fetch=fetch):Promise<GeneratedGraphic>{
 if(!config.enabled)throw new Error("GRAPHIC_GENERATION_DISABLED");
 if(!config.apiKey)throw new Error("IMAGE_PROVIDER_NOT_CONFIGURED");
 if(!input.jobId.trim()||!input.prompt.trim()||input.prompt.length>4000)throw new Error("INVALID_GRAPHIC_JOB");
 const endpoint=config.endpoint??"https://api.openai.com/v1/images/generations";
 const url=new URL(endpoint);
 if(url.protocol!=="https:"||url.hostname!=="api.openai.com"||url.username||url.password||url.search||url.hash)throw new Error("INVALID_IMAGE_PROVIDER_ENDPOINT");
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),90000);
 try{
  const response=await request(url.toString(),{method:"POST",headers:{"Authorization":"Bearer "+config.apiKey,"Content-Type":"application/json"},body:JSON.stringify({model:config.model??"gpt-image-1",prompt:input.prompt,size:"1024x1024",response_format:"b64_json"}),signal:controller.signal,cache:"no-store"});
  if(!response.ok)throw new Error("IMAGE_PROVIDER_REQUEST_FAILED");
  const result=await response.json() as {data?:{b64_json?:string}[]};
  const encoded=result.data?.[0]?.b64_json;
  if(!encoded||encoded.length>8_000_000||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))throw new Error("INVALID_IMAGE_PROVIDER_OUTPUT");
  const bytes=new Uint8Array(Buffer.from(encoded,"base64"));
  if(bytes.length<8||bytes.length>5*1024*1024||bytes[0]!==137||bytes[1]!==80||bytes[2]!==78||bytes[3]!==71||bytes[4]!==13||bytes[5]!==10||bytes[6]!==26||bytes[7]!==10)throw new Error("INVALID_GENERATED_PNG");
  return {bytes,contentType:"image/png",providerJobId:input.jobId};
 }finally{clearTimeout(timeout)}
}
