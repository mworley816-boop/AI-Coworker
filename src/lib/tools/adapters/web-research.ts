import type {ToolAdapter,ToolExecutionResult} from "@/lib/tools/executor";
type SearchItem={title?:string;url?:string;content?:string};
function normalize(items:SearchItem[]){
 const seen=new Set<string>();
 const sources:{title:string;url:string;snippet:string;sourceHost:string}[]=[];
 for(const item of items){
  if(typeof item.url!=="string")continue;
  let url:URL;try{url=new URL(item.url);}catch{continue;}
  if(url.protocol!=="https:"&&url.protocol!=="http:")continue;
  if(url.username||url.password)continue;
  const host=url.hostname.toLowerCase();
  if(!host||host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local")||host.endsWith(".internal")||host==="127.0.0.1"||host==="::1"||/^(?:10|127|169\.254|192\.168)\./.test(host)||/^172\.(?:1[6-9]|2\d|3[01])\./.test(host))continue;
  url.hash="";
  const normalized=url.toString();
  if(seen.has(normalized))continue;
  seen.add(normalized);
  sources.push({title:typeof item.title==="string"?item.title.slice(0,240):"Source",url:normalized,snippet:typeof item.content==="string"?item.content.slice(0,800):"",sourceHost:host});
  if(sources.length===8)break;
 }
 return sources;
}
export const webResearchAdapter:ToolAdapter={id:"web.research",async execute(input):Promise<ToolExecutionResult>{const query=typeof input.goal==="string"?input.goal.trim():"";if(!query)return {ok:false,toolId:"web.research",message:"Research query is required"};const endpoint=process.env.WEB_RESEARCH_API_URL;const key=process.env.WEB_RESEARCH_API_KEY;if(!endpoint||!key)return {ok:false,toolId:"web.research",message:"Web research provider is not configured"};let url:URL;try{url=new URL(endpoint);}catch{return {ok:false,toolId:"web.research",message:"Web research provider URL is invalid"};}if(url.protocol!=="https:")return {ok:false,toolId:"web.research",message:"Web research provider must use HTTPS"};const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);let response:Response;try{response=await fetch(url,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${key}`},signal:controller.signal,body:JSON.stringify({query,max_results:8})});}catch(error){return {ok:false,toolId:"web.research",message:error instanceof Error&&error.name==="AbortError"?"Web research provider timed out":"Web research provider request failed"};}finally{clearTimeout(timeout);}if(!response.ok)return {ok:false,toolId:"web.research",message:`Web research provider returned ${response.status}`};let payload:{results?:SearchItem[]};try{payload=await response.json() as {results?:SearchItem[]};}catch{return {ok:false,toolId:"web.research",message:"Web research provider returned invalid JSON"};}const sources=normalize(Array.isArray(payload.results)?payload.results:[]);if(sources.length===0)return {ok:false,toolId:"web.research",message:"Web research provider returned no usable sources"};return {ok:true,toolId:"web.research",message:`Research completed with ${sources.length} sources.`,data:{query,sources,sourceCount:sources.length,verificationStatus:"unverified",note:"Search results are leads, not verified manufacturer evidence. Inspect source content and attribution before approving claims."}};}};