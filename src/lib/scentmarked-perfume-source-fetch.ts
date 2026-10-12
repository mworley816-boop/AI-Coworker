import {planPerfumeSourceRetrieval} from "./scentmarked-perfume-source-retrieval-policy";
export type PerfumeSourceFetchResult={ok:true;url:string;html:string}|{ok:false;reason:string};
/** Fetches only explicitly planned manufacturer URLs. Does not parse, save or publish. */
export async function fetchPerfumeSourcePage(house:string,rawUrl:string,fetcher:typeof fetch=fetch):Promise<PerfumeSourceFetchResult>{
 const plan=planPerfumeSourceRetrieval(house,rawUrl);
 if(!plan.ok)return {ok:false,reason:plan.reason};
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetcher(plan.url,{method:"GET",redirect:"error",signal:controller.signal,headers:{accept:"text/html"}});
  if(!response.ok)return {ok:false,reason:"SOURCE_HTTP_ERROR"};
  if(response.url&&response.url!==plan.url)return {ok:false,reason:"SOURCE_REDIRECTED"};
  const mime=response.headers.get("content-type")?.toLowerCase()??"";
  if(!mime.startsWith("text/html"))return {ok:false,reason:"SOURCE_NOT_HTML"};
  const length=Number(response.headers.get("content-length"));
  if(Number.isFinite(length)&&length>plan.maxBytes)return {ok:false,reason:"SOURCE_TOO_LARGE"};
  if(!response.body)return {ok:false,reason:"SOURCE_EMPTY"};
  const reader=response.body.getReader();
  const chunks:Uint8Array[]=[];
  let total=0;
  try{
   while(true){
    const {done,value}=await reader.read();
    if(done)break;
    total+=value.byteLength;
    if(total>plan.maxBytes){await reader.cancel();return {ok:false,reason:"SOURCE_TOO_LARGE"}}
    chunks.push(value);
   }
  }finally{reader.releaseLock()}
  const bytes=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  return {ok:true,url:plan.url,html:new TextDecoder("utf-8",{fatal:false}).decode(bytes)};
 }catch{return {ok:false,reason:"SOURCE_FETCH_FAILED"}}
 finally{clearTimeout(timeout)}
}
