import {runtimeEnv} from "@/lib/runtime-env";
import type {ToolAdapter,ToolExecutionResult} from "@/lib/tools/executor";
type SearchItem={title?:string;url?:string;content?:string};
// Search APIs work best with subject keywords, not multi-step agent instructions.
// Preserve the original goal for reporting; only simplify the provider query.
function toSearchQuery(goal:string):string{
 const first=goal.split(/(?:[.!?]\s+|\n)/,1)[0].trim();
 const cleaned=first.replace(/^(?:please\s+)?(?:research|look up|find information about|search for)\s+/i,"").trim();
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
// For perfume-note research, a general fragrance-trends article is not evidence
// about the requested product. Require distinctive product words in the URL/title
// or excerpt; do not confuse a brand mention with a product match.
function relevantPerfumeSources<T extends {title:string;url:string;snippet:string}>(sources:T[],goal:string):T[]{
 const noteIntent=/\b(?:fragrance|perfume|scent)\s+notes?\b/i.test(goal);
 if(!noteIntent)return sources;
 const subject=goal.replace(/^(?:please\s+)?(?:research|find|look up|search for)\s+/i,"")
   .split(/\b(?:fragrance|perfume|scent)\s+notes?\b/i)[0]
   .replace(/\b(?:using|from|on|at|official|manufacturer|website|the)\b/gi," ").trim();
 const tokens=subject.toLowerCase().match(/[a-z0-9]+/g)??[];
 const generic=new Set(["arabiyat","sugar","prestige","perfume","parfum","fragrance","by","for","and","of"]);
 const distinctive=[...new Set(tokens.filter(t=>t.length>=3&&!generic.has(t)))];
 if(distinctive.length<2)return sources;
 return sources.filter(source=>{
  const text=(source.title+" "+source.url+" "+source.snippet).toLowerCase().replace(/[^a-z0-9]+/g," ");
  return distinctive.filter(token=>new RegExp("(?:^| )"+token+"(?: |$)").test(text)).length>=2;
 });
}
// An explicitly configured, brand-scoped domain registry is required before
// labelling a source as a manufacturer-domain candidate. This is NOT verification
// of page authorship or of any fragrance note claim.
function classifySourceHosts<T extends {url:string;sourceHost:string}>(sources:T[],goal:string,raw:unknown){
 const registry:Record<string,string[]>= {};
 if(typeof raw==="string"){
  try{
   const parsed:unknown=JSON.parse(raw);
   if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed)){
    for(const [brand,domains] of Object.entries(parsed as Record<string,unknown>)){
     if(Array.isArray(domains))registry[brand.toLowerCase()]=domains.filter((d):d is string=>typeof d==="string"&&/^[a-z0-9.-]+$/i.test(d)&&d.includes(".")).map(d=>d.toLowerCase());
    }
   }
  }catch{/* Invalid configuration must never confer authority. */}
 }
 const brands=Object.keys(registry).filter(brand=>brand.length>=3&&goal.toLowerCase().includes(brand));
 return sources.map(source=>{
  const matched=brands.some(brand=>registry[brand].some(domain=>source.sourceHost===domain||source.sourceHost.endsWith("."+domain)));
  return {...source,sourceClassification:matched?"manufacturer_domain_candidate":"unclassified",manufacturerVerified:false};
 });
}
// Extract only explicitly labelled note groups from the saved search excerpts.
// These are attributed search-snippet claims, not independently verified facts.
function extractSnippetClaims(sources:{url:string;snippet:string;sourceHost:string;sourceClassification:string}[]){
 const grouped=new Map<string,{claim:string;sourceUrls:string[];status:"unverified"|"conflicting";notes:string}>();
 const sourceNotes=new Map<string,Set<string>>();
  const label=/(?:^|[.;\n]\s*)(top|heart|middle|base)\s+notes?\s*(?:are|include|:|–|—|-)\s*([^.;\n]{3,180})/gi;
 for(const source of sources){
  const snippet=source.snippet;
  for(const match of snippet.matchAll(label)){
   const group=match[1].toLowerCase()==="middle"?"heart":match[1].toLowerCase();
   const raw=match[2].replace(/\s+(?:and|with)\s+/gi,", ");
   const values=raw.split(/[,|/]/).map(x=>x.trim()).filter(x=>/^[\p{L}][\p{L}\p{M}\s\x27-]{1,40}$/u.test(x)).slice(0,12);
   for(const value of values){
    const claim=`${value} is listed as a ${group} note`;
    const key=`${group}:${value.toLocaleLowerCase("en")}`;
    const recorded=sourceNotes.get(source.url)??new Set<string>();recorded.add(key);sourceNotes.set(source.url,recorded);
    const existing=grouped.get(key);
    if(existing){if(!existing.sourceUrls.includes(source.url))existing.sourceUrls.push(source.url);}
    else grouped.set(key,{claim,sourceUrls:[source.url],status:"unverified",notes:"Extracted from a third-party search snippet; review the linked page before relying on this claim."});
    if(grouped.size>=60)break;
   }
   if(grouped.size>=60)break;
  }
  if(grouped.size>=60)break;
 }
 // Corroboration requires distinct source hosts, not multiple pages on one site.
 // A configured manufacturer domain is a candidate only, never confirmation.
 for(const claim of grouped.values()){
  const supporting=sources.filter(source=>claim.sourceUrls.includes(source.url));
  const hosts=new Set(supporting.map(source=>source.sourceHost));
  const manufacturerCandidates=new Set(supporting.filter(source=>source.sourceClassification==="manufacturer_domain_candidate").map(source=>source.sourceHost));
  if(hosts.size>=2){
   claim.notes="Matching labelled snippets from "+hosts.size+" distinct source hosts (possible shared upstream data); independently review the linked pages.";
  }
  if(manufacturerCandidates.size>0){
   claim.notes+=" "+manufacturerCandidates.size+" configured manufacturer-domain candidate host(s) appear among the sources; manufacturer authorship and claims are not verified.";
  }
 }
 const placements=new Map<string,Set<string>>();
 for(const key of grouped.keys()){
  const index=key.indexOf(":");
  const group=key.slice(0,index);
  const note=key.slice(index+1);
  const groups=placements.get(note)??new Set<string>();
  groups.add(group);
  placements.set(note,groups);
 }
 for(const [key,claim] of grouped){
  const note=key.slice(key.indexOf(":")+1);
  const groups=placements.get(note);
  if(!groups||groups.size<2)continue;
  claim.status="conflicting";
  claim.notes="Potential note placement discrepancy across labelled snippet sections: "+[...groups].join(" vs ")+". Review the cited pages; some notes legitimately appear in multiple stages.";
  for(const [otherKey,otherClaim] of grouped){
   if(otherKey===key||otherKey.slice(otherKey.indexOf(":")+1)!==note)continue;
   for(const url of otherClaim.sourceUrls)if(!claim.sourceUrls.includes(url))claim.sourceUrls.push(url);
  }
 }
 return [...grouped.values()].map(claim=>{
  const supporting=sources.filter(source=>claim.sourceUrls.includes(source.url));
  const independentHostCount=new Set(supporting.map(source=>source.sourceHost)).size;
  const manufacturerDomainCandidateCount=new Set(supporting.filter(source=>source.sourceClassification==="manufacturer_domain_candidate").map(source=>source.sourceHost)).size;
  // Compare extracted labelled note sets, not retailer marketing text.
  // Require at least four notes and >= 85% Jaccard overlap before flagging
  // possible shared upstream descriptions; never assert copying.
  const groups:{hosts:Set<string>;notes:Set<string>|null}[]=[];
  for(const source of supporting){
   const notes=sourceNotes.get(source.url)??new Set<string>();
   const match=notes.size>=4?groups.find(group=>{
    if(!group.notes||group.notes.size<4)return false;
    const intersection=[...notes].filter(note=>group.notes?.has(note)).length;
    const union=new Set([...notes,...group.notes]).size;
    return union>0&&intersection/union>=0.85;
   }):undefined;
   if(match){match.hosts.add(source.sourceHost);continue;}
   const existing=groups.find(group=>group.hosts.has(source.sourceHost));
   if(existing){continue;}
   groups.push({hosts:new Set([source.sourceHost]),notes:notes.size>=4?notes:null});
  }
  const effectiveEvidenceGroupCount=groups.length;
  const possibleDuplicateHostCount=groups.reduce((total,group)=>total+Math.max(0,group.hosts.size-1),0);
  const duplicateEvidenceWarning=possibleDuplicateHostCount>0?"Similar extracted note lists (at least four notes, 85% overlap) occur on multiple hosts; possible shared upstream information, not confirmed copying.":"No strong cross-host note-list similarity detected; absence of a match does not prove independence.";
  // This bounded heuristic ranks manual review only. It cannot prove a claim.
  const score=Math.min(100,25+Math.min(30,Math.max(0,effectiveEvidenceGroupCount-1)*15)+Math.min(20,manufacturerDomainCandidateCount*20)-(claim.status==="conflicting"?35:0));
  const evidenceQuality=claim.status==="conflicting"?"conflict_review":score>=60?"higher_review_priority":score>=40?"moderate_review_priority":"limited_evidence";
  return {...claim,independentHostCount,manufacturerDomainCandidateCount,effectiveEvidenceGroupCount,possibleDuplicateHostCount,duplicateEvidenceWarning,evidenceQualityScore:score,evidenceQuality,qualityScorePolicy:"Heuristic review priority only: labelled note snippet +25, each additional distinct note-list similarity group +15 (max +30), configured manufacturer-domain candidate +20 (max +20), conflict -35. Neither scores nor hosts establish independent verification."};
 });
}
// Retry only when the provider returned no usable, product-relevant sources.
// Keep a small bounded query set to avoid unbounded provider usage.
function targetedQueries(goal:string):string[]{
 const primary=toSearchQuery(goal);
 const subject=primary.replace(/\b(?:fragrance|perfume|scent)\s+notes?\b/gi," ")
   .replace(/\b(?:official|manufacturer|website|using|from|sources|please)\b/gi," ")
   .replace(/\s+/g," ").trim();
 const candidates=[primary,subject?subject+" perfume notes":"",subject?'"'+subject+'" fragrance notes':""];
 return [...new Set(candidates.filter(q=>q.length>=5).map(q=>q.slice(0,200)))].slice(0,3);
}
export const webResearchAdapter:ToolAdapter={id:"web.research",async execute(input):Promise<ToolExecutionResult>{const query=typeof input.goal==="string"?input.goal.trim():"";if(!query)return {ok:false,toolId:"web.research",message:"Research query is required"};const env=await runtimeEnv();const endpoint=env.WEB_RESEARCH_API_URL;const key=env.WEB_RESEARCH_API_KEY;const proxy=(env as Record<string,unknown>).ATLAS_RESEARCH_PROXY as {fetch:(request:Request)=>Promise<Response>}|undefined;if(!endpoint||!key)return {ok:false,toolId:"web.research",message:"Web research provider is not configured"};let url:URL;try{url=new URL(endpoint);}catch{return {ok:false,toolId:"web.research",message:"Web research provider URL is invalid"};}if(url.protocol!=="https:")return {ok:false,toolId:"web.research",message:"Web research provider must use HTTPS"};const searches=targetedQueries(query);let sourcesFound:ReturnType<typeof normalize>=[];let attempts=0;let lastFailure="";const searchHistory:{query:string;resultCount:number;relevantCount:number;rejectedCount:number}[]=[];for(const searchTerm of searches){attempts++;const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);let response:Response;try{const request=new Request(url,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${key}`},signal:controller.signal,body:JSON.stringify({query:searchTerm,max_results:8})});response=proxy&&typeof proxy.fetch==="function"?await proxy.fetch(request):await fetch(request);}catch(error){return {ok:false,toolId:"web.research",message:error instanceof Error&&error.name==="AbortError"?"Web research provider timed out":"Web research provider request failed"};}finally{clearTimeout(timeout);}if(!response.ok){const destination=`${url.hostname}${url.pathname}`;let detail="";try{const body=await response.json() as unknown;if(body&&typeof body==="object"&&!Array.isArray(body)){const data=body as Record<string,unknown>;const error=typeof data.error==="string"?data.error.slice(0,120):"";const status=typeof data.provider_status==="number"&&Number.isInteger(data.provider_status)?`upstream HTTP ${data.provider_status}`:"";const shape=data.provider_shape;if(shape&&typeof shape==="object"&&!Array.isArray(shape)){const info=shape as Record<string,unknown>;const keys=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"&&/^[a-zA-Z0-9_]{1,40}$/.test(x)).slice(0,12).join(","):"";detail=`response keys: ${keys(info.top_level_keys)}; result keys: ${keys(info.result_keys)}; first item keys: ${keys(info.first_item_keys)}; item count: ${typeof info.item_count==="number"?info.item_count:"unknown"}`;}else detail=[error,status].filter(Boolean).join("; ");}}catch{}return {ok:false,toolId:"web.research",message:`Web research provider returned ${response.status} from ${destination} via ${proxy&&typeof proxy.fetch==="function"?"service binding":"public fetch"}${detail?` (${detail})`:""}`};}let payload:{results?:SearchItem[]};try{payload=await response.json() as {results?:SearchItem[]};}catch{return {ok:false,toolId:"web.research",message:"Web research provider returned invalid JSON"};}const normalized=normalize(Array.isArray(payload.results)?payload.results:[]);const relevant=relevantPerfumeSources(normalized,query);searchHistory.push({query:searchTerm,resultCount:normalized.length,relevantCount:relevant.length,rejectedCount:normalized.length-relevant.length});if(relevant.length){sourcesFound=relevant;break;}lastFailure=normalized.length?"Search returned unrelated perfume sources":"Search returned no usable sources";}if(!sourcesFound.length)return {ok:false,toolId:"web.research",message:`No product-relevant research sources after ${attempts} targeted searches. ${lastFailure}. No fragrance-note claims were saved.`};const sources=classifySourceHosts(sourcesFound,query,(env as Record<string,unknown>).ATLAS_MANUFACTURER_DOMAINS).sort((a,b)=>Number(b.sourceClassification==="manufacturer_domain_candidate")-Number(a.sourceClassification==="manufacturer_domain_candidate"));if(sources.length===0)return {ok:false,toolId:"web.research",message:"Web research provider returned no usable sources"};return {ok:true,toolId:"web.research",message:`Research completed with ${sources.length} sources.`,data:{query,searchAttempts:attempts,searchHistory,rejectedSourceCount:searchHistory.reduce((total,item)=>total+item.rejectedCount,0),sourcePriorityPolicy:"Configured manufacturer-domain candidates appear first; no source or claim is automatically verified.",searchStrategy:"bounded_product_relevance_retry",sources,claimEvidence:extractSnippetClaims(sources),sourceCount:sources.length,sourceClassificationPolicy:"Only explicitly configured brand domains can be manufacturer-domain candidates; no page or claim is verified automatically.",verificationStatus:"unverified",note:"Search results are leads, not verified manufacturer evidence. Inspect source content and attribution before approving claims."}};}};