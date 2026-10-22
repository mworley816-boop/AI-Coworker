import {runtimeEnv} from "@/lib/runtime-env";
import type {ToolAdapter,ToolExecutionResult} from "@/lib/tools/executor";
type SearchItem={title?:string;url?:string;content?:string};
// Search APIs work best with subject keywords, not multi-step agent instructions.
// Preserve the original goal for reporting; only simplify the provider query.
function toSearchQuery(goal:string):string{
 const first=goal.split(/(?:[.!?]\\s+|\\n)/,1)[0].trim();
 const cleaned=first.replace(/^(?:please\\s+)?(?:research|look up|find information about|search for)\\s+/i,"").trim();
 return (cleaned||goal).slice(0,200).trim();
}

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
// Extract only explicitly labelled note groups from the saved search excerpts.
// These are attributed search-snippet claims, not independently verified facts.
function extractSnippetClaims(sources:{url:string;snippet:string}[]){
 const grouped=new Map<string,{claim:string;sourceUrls:string[];status:"unverified";notes:string}>();
 const label=/(?:^|[.;\\n]\\s*)(top|heart|middle|base)\\s+notes?\\s*(?:are|include|:|–|—|-)\\s*([^.;\\n]{3,180})/gi;
 for(const source of sources){
  const snippet=source.snippet;
  for(const match of snippet.matchAll(label)){
   const group=match[1].toLowerCase()==="middle"?"heart":match[1].toLowerCase();
   const raw=match[2].replace(/\\s+(?:and|with)\\s+/gi,", ");
   const values=raw.split(/,|\\||\\//).map(x=>x.trim()).filter(x=>/^[\\p{L}][\\p{L}\\p{M}\\s'-]{1,40}$/u.test(x)).slice(0,12);
   for(const value of values){
    const claim=`${value} is listed as a ${group} note`;
    const key=`${group}:${value.toLocaleLowerCase("en")}`;
    const existing=grouped.get(key);
    if(existing){if(!existing.sourceUrls.includes(source.url))existing.sourceUrls.push(source.url);}
    else grouped.set(key,{claim,sourceUrls:[source.url],status:"unverified",notes:"Extracted from a third-party search snippet; review the linked page before relying on this claim."});
    if(grouped.size>=60)break;
   }
   if(grouped.size>=60)break;
  }
  if(grouped.size>=60)break;
 }
 return [...grouped.values()];
}
export const webResearchAdapter:ToolAdapter={id:"web.research",async execute(input):Promise<ToolExecutionResult>{const query=typeof input.goal==="string"?input.goal.trim():"";if(!query)return {ok:false,toolId:"web.research",message:"Research query is required"};const env=await runtimeEnv();const endpoint=env.WEB_RESEARCH_API_URL;const key=env.WEB_RESEARCH_API_KEY;const proxy=(env as Record<string,unknown>).ATLAS_RESEARCH_PROXY as {fetch:(request:Request)=>Promise<Response>}|undefined;if(!endpoint||!key)return {ok:false,toolId:"web.research",message:"Web research provider is not configured"};let url:URL;try{url=new URL(endpoint);}catch{return {ok:false,toolId:"web.research",message:"Web research provider URL is invalid"};}if(url.protocol!=="https:")return {ok:false,toolId:"web.research",message:"Web research provider must use HTTPS"};const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);let response:Response;try{const request=new Request(url,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${key}`},signal:controller.signal,body:JSON.stringify({query:toSearchQuery(query),max_results:8})});response=proxy&&typeof proxy.fetch==="function"?await proxy.fetch(request):await fetch(request);}catch(error){return {ok:false,toolId:"web.research",message:error instanceof Error&&error.name==="AbortError"?"Web research provider timed out":"Web research provider request failed"};}finally{clearTimeout(timeout);}if(!response.ok){const destination=`${url.hostname}${url.pathname}`;let detail="";try{const body=await response.json() as unknown;if(body&&typeof body==="object"&&!Array.isArray(body)){const data=body as Record<string,unknown>;const error=typeof data.error==="string"?data.error.slice(0,120):"";const status=typeof data.provider_status==="number"&&Number.isInteger(data.provider_status)?`upstream HTTP ${data.provider_status}`:"";const shape=data.provider_shape;if(shape&&typeof shape==="object"&&!Array.isArray(shape)){const info=shape as Record<string,unknown>;const keys=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"&&/^[a-zA-Z0-9_]{1,40}$/.test(x)).slice(0,12).join(","):"";detail=`response keys: ${keys(info.top_level_keys)}; result keys: ${keys(info.result_keys)}; first item keys: ${keys(info.first_item_keys)}; item count: ${typeof info.item_count==="number"?info.item_count:"unknown"}`;}else detail=[error,status].filter(Boolean).join("; ");}}catch{}return {ok:false,toolId:"web.research",message:`Web research provider returned ${response.status} from ${destination} via ${proxy&&typeof proxy.fetch==="function"?"service binding":"public fetch"}${detail?` (${detail})`:""}`};}let payload:{results?:SearchItem[]};try{payload=await response.json() as {results?:SearchItem[]};}catch{return {ok:false,toolId:"web.research",message:"Web research provider returned invalid JSON"};}const sources=normalize(Array.isArray(payload.results)?payload.results:[]);if(sources.length===0)return {ok:false,toolId:"web.research",message:"Web research provider returned no usable sources"};return {ok:true,toolId:"web.research",message:`Research completed with ${sources.length} sources.`,data:{query,sources,claimEvidence:extractSnippetClaims(sources),sourceCount:sources.length,verificationStatus:"unverified",note:"Search results are leads, not verified manufacturer evidence. Inspect source content and attribution before approving claims."}};}};