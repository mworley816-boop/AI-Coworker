"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
type Step={title:string;status:string;kind?:string;output:Record<string,unknown>|null};
type Source={title:string;url:string;snippet:string;sourceClassification:"manufacturer_domain_candidate"|"unclassified";manufacturerVerified:false};
type StoredReport={summary?:string;deliverable?:unknown;sources?:unknown};
type ClaimEvidence={claim:string;sourceUrls:string[];status:"unverified"|"single_source"|"third_party_corroborated"|"manufacturer_confirmed"|"conflicting";notes?:string;independentHostCount?:number;manufacturerDomainCandidateCount?:number;evidenceQualityScore?:number;evidenceQuality?:string;qualityScorePolicy?:string;effectiveEvidenceGroupCount?:number;possibleDuplicateHostCount?:number;duplicateEvidenceWarning?:string;supportingSourceHosts?:string[];candidateManufacturerHosts?:string[];sourceAttributionStatus?:string;sourceAttributionWarning?:string;reviewFlags?:string[];manualReviewRequired?:boolean};
function extractClaims(value:unknown):ClaimEvidence[]{
 if(!value||typeof value!=="object"||Array.isArray(value))return [];
 const row=value as Record<string,unknown>;
 const nested=row.data&&typeof row.data==="object"&&!Array.isArray(row.data)?row.data as Record<string,unknown>:null;
 const candidate=row.claimEvidence??row.claims??nested?.claimEvidence??nested?.claims;
 if(!Array.isArray(candidate))return [];
 const allowed=new Set(["unverified","single_source","third_party_corroborated","manufacturer_confirmed","conflicting"]);
 return candidate.flatMap((item):ClaimEvidence[]=>{
  if(!item||typeof item!=="object"||Array.isArray(item))return [];
  const c=item as Record<string,unknown>;
  const claim=typeof c.claim==="string"?c.claim.trim():typeof c.text==="string"?c.text.trim():"";
  if(!claim)return [];
  const sourceUrls=Array.isArray(c.sourceUrls)?c.sourceUrls.filter((x):x is string=>typeof x==="string"):Array.isArray(c.sources)?c.sources.filter((x):x is string=>typeof x==="string"):[];
  // Treat producer-supplied statuses as provisional until there is a human review workflow.
  const status=typeof c.status==="string"&&allowed.has(c.status)?c.status as ClaimEvidence["status"]:"unverified";
  return [{claim:claim.slice(0,600),sourceUrls:sourceUrls.slice(0,15),status,notes:typeof c.notes==="string"?c.notes.slice(0,500):undefined,independentHostCount:typeof c.independentHostCount==="number"&&Number.isInteger(c.independentHostCount)&&c.independentHostCount>=0?c.independentHostCount:undefined,manufacturerDomainCandidateCount:typeof c.manufacturerDomainCandidateCount==="number"&&Number.isInteger(c.manufacturerDomainCandidateCount)&&c.manufacturerDomainCandidateCount>=0?c.manufacturerDomainCandidateCount:undefined,evidenceQualityScore:typeof c.evidenceQualityScore==="number"&&Number.isFinite(c.evidenceQualityScore)?Math.max(0,Math.min(100,c.evidenceQualityScore)):undefined,evidenceQuality:typeof c.evidenceQuality==="string"?c.evidenceQuality:undefined,qualityScorePolicy:typeof c.qualityScorePolicy==="string"?c.qualityScorePolicy:undefined,effectiveEvidenceGroupCount:typeof c.effectiveEvidenceGroupCount==="number"?c.effectiveEvidenceGroupCount:undefined,possibleDuplicateHostCount:typeof c.possibleDuplicateHostCount==="number"?c.possibleDuplicateHostCount:undefined,duplicateEvidenceWarning:typeof c.duplicateEvidenceWarning==="string"?c.duplicateEvidenceWarning.slice(0,400):undefined,supportingSourceHosts:Array.isArray(c.supportingSourceHosts)?c.supportingSourceHosts.filter((h):h is string=>typeof h==="string").slice(0,15):undefined,candidateManufacturerHosts:Array.isArray(c.candidateManufacturerHosts)?c.candidateManufacturerHosts.filter((h):h is string=>typeof h==="string").slice(0,15):undefined,sourceAttributionStatus:typeof c.sourceAttributionStatus==="string"?c.sourceAttributionStatus.slice(0,80):undefined,sourceAttributionWarning:typeof c.sourceAttributionWarning==="string"?c.sourceAttributionWarning.slice(0,400):undefined,reviewFlags:Array.isArray(c.reviewFlags)?c.reviewFlags.filter((flag):flag is string=>typeof flag==="string").slice(0,8):undefined,manualReviewRequired:c.manualReviewRequired===true}];
 }).slice(0,100);
}
type ResearchAttempt={query:string;resultCount:number;relevantCount:number;rejectedCount:number};
function researchDiagnostics(value:unknown):{attempts:number;history:ResearchAttempt[]}|null{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const row=value as Record<string,unknown>;
 const data=row.data&&typeof row.data==="object"&&!Array.isArray(row.data)?row.data as Record<string,unknown>:row;
 if(typeof data.searchAttempts!=="number"||!Number.isFinite(data.searchAttempts))return null;
 const history=Array.isArray(data.searchHistory)?data.searchHistory.flatMap((item):ResearchAttempt[]=>{
  if(!item||typeof item!=="object"||Array.isArray(item))return [];
  const attempt=item as Record<string,unknown>;
  if(typeof attempt.query!=="string")return [];
  const count=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)?Math.max(0,Math.floor(v)):0;
  return [{query:attempt.query.slice(0,200),resultCount:count(attempt.resultCount),relevantCount:count(attempt.relevantCount),rejectedCount:count(attempt.rejectedCount)}];
 }):[];
 return {attempts:Math.max(0,Math.floor(data.searchAttempts)),history:history.slice(0,3)};
}
function evidenceType(source:Source):string{
 return source.sourceClassification==="manufacturer_domain_candidate"?"Manufacturer-domain candidate":"Unclassified source";
}
function evidenceStatus(sources:Source[]):string{
 if(!sources.length)return "No source evidence saved";
 // Multiple search hits do not establish independent confirmation of individual claims.
 return "Sources collected — claims not independently verified";
}
function safeSource(item:unknown):Source|null{
 if(!item||typeof item!=="object"||Array.isArray(item))return null;
 const row=item as Record<string,unknown>;
 if(typeof row.url!=="string")return null;
 let url:URL;try{url=new URL(row.url);}catch{return null;}
 if(!["https:","http:"].includes(url.protocol)||url.username||url.password)return null;
 const host=url.hostname.toLowerCase();
 if(!host||host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local")||host.endsWith(".internal")||host==="127.0.0.1"||host==="::1"||/^(?:10|127|169\\.254|192\\.168)\\./.test(host)||/^172\\.(?:1[6-9]|2\\d|3[01])\\./.test(host))return null;
 return {url:url.toString(),title:typeof row.title==="string"?row.title.slice(0,240):host,snippet:typeof row.snippet==="string"?row.snippet.slice(0,800):"",sourceClassification:row.sourceClassification==="manufacturer_domain_candidate"?"manufacturer_domain_candidate":"unclassified",manufacturerVerified:false};
}
function extractSources(value:unknown):Source[]{
 if(!value||typeof value!=="object"||Array.isArray(value))return [];
 const record=value as Record<string,unknown>;
 const data=record.data&&typeof record.data==="object"&&!Array.isArray(record.data)?record.data as Record<string,unknown>:null;
 const candidates=[record.sources,data?.sources,record.results,data?.results];
 return candidates.flatMap(x=>Array.isArray(x)?x.map(safeSource).filter((s):s is Source=>s!==null):[]);
}
export default function CompletionReport({runId}:{runId:string}){
 const [report,setReport]=useState<{status:string;steps:Step[];stored:StoredReport|null}|null>(null);
 useEffect(()=>{let active=true;async function load(){const s=createClient();if(!s)return;const [run,steps,log]=await Promise.all([s.from("runs").select("status").eq("id",runId).single(),s.from("run_steps").select("title,status,kind,output").eq("run_id",runId).order("position"),s.from("activity_logs").select("metadata").eq("run_id",runId).eq("event_type","run.report").order("created_at",{ascending:false}).limit(1).maybeSingle()]);if(active&&run.data&&steps.data)setReport({status:run.data.status,steps:steps.data as Step[],stored:(log.data?.metadata??null) as StoredReport|null});}void load();return()=>{active=false;};},[runId]);
 if(!report||!["completed","cancelled","failed"].includes(report.status))return null;
 const completed=report.steps.filter(s=>s.status==="completed");
 const deliverable=typeof report.stored?.deliverable==="string"?report.stored.deliverable:null;
 const sourceCandidates=[...extractSources(report.stored),...report.steps.filter(s=>s.kind==="research").flatMap(s=>extractSources(s.output))];
 const sourceByUrl=new Map<string,Source>();for(const source of sourceCandidates){const previous=sourceByUrl.get(source.url);if(!previous||previous.sourceClassification==="unclassified"&&source.sourceClassification==="manufacturer_domain_candidate")sourceByUrl.set(source.url,source);}const sources=[...sourceByUrl.values()].sort((a,b)=>Number(b.sourceClassification==="manufacturer_domain_candidate")-Number(a.sourceClassification==="manufacturer_domain_candidate")).slice(0,30);
 const claims=[...extractClaims(report.stored),...report.steps.filter(s=>s.kind==="research").flatMap(s=>extractClaims(s.output))];
 const sourceMap=new Map(sources.map(source=>[source.url,source]));
 const researchCompleted=report.steps.some(s=>s.kind==="research"&&s.status==="completed");
 const diagnostics=report.steps.filter(s=>s.kind==="research").map(s=>researchDiagnostics(s.output)).find((x):x is NonNullable<typeof x>=>x!==null)??researchDiagnostics(report.stored);
 return <section className="completion-report"><h4>Run report · {report.status}</h4><p>{report.stored?.summary??`${completed.length} of ${report.steps.length} planned steps completed.`}</p>
 {deliverable&&<div><h4>Finished deliverable</h4><p style={{whiteSpace:"pre-wrap"}}>{deliverable}</p></div>}
 {diagnostics&&<div><h4>Research search history</h4><p>{diagnostics.attempts} search attempt{diagnostics.attempts===1?"":"s"} recorded. These counts describe search results, not verified claims.</p>{diagnostics.history.length>0&&<ol>{diagnostics.history.map((attempt,index)=><li key={index}><strong>{attempt.query}</strong> — {attempt.resultCount} results; {attempt.relevantCount} relevant; {attempt.rejectedCount} rejected.</li>)}</ol>}</div>}
 {(sources.length>0||researchCompleted)&&<div><h4>Research evidence</h4>{sources.length>0?<><p>{sources.length} recorded source link{sources.length===1?"":"s"}. Source links are leads, not proof that individual claims are correct.</p><p><strong>Evidence status:</strong> {evidenceStatus(sources)}</p><p>Manufacturer-confirmed, third-party-corroborated, and conflicting claims require claim-level review. No claim is automatically promoted based only on matching search results.</p><ul>{sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>{s.snippet&&<p>{s.snippet}</p>}<small>{evidenceType(s)} · Unverified claim support</small></li>)}</ul></>:<p>Research completed, but no source URLs were found in the stored report or research step output. Evidence may not have been persisted; this run cannot be source-verified from the report.</p>}</div>}
 {(researchCompleted||claims.length>0)&&(
 <div>
  <h4>Claim verification</h4>
  {claims.length>0 ? (
   <>
    <p>{claims.length} recorded claims. All statuses are provisional until reviewed.</p>
    <ul>{claims.map((claim,index)=>(
     <li key={index}>
      <strong>{claim.claim}</strong>
      <p><small>Recorded status: {claim.status.replaceAll("_"," ")} · Not independently verified by Atlas</small></p>
      {claim.independentHostCount!==undefined&&<p><small>Distinct supporting source hosts: {claim.independentHostCount} · Manufacturer-domain candidate hosts: {claim.manufacturerDomainCandidateCount??0}. Host diversity does not establish independent reporting or claim verification.</small></p>}{claim.effectiveEvidenceGroupCount!==undefined&&<p><small>Distinct note-description groups: {claim.effectiveEvidenceGroupCount} · Possible duplicate hosts: {claim.possibleDuplicateHostCount??0}. Similar extracted note lists may share upstream data; this is a warning, not proof of copying.</small></p>}{claim.duplicateEvidenceWarning&&<p><small>{claim.duplicateEvidenceWarning}</small></p>}{claim.sourceAttributionWarning&&<p><small>Source attribution: {claim.sourceAttributionWarning}</small></p>}{claim.reviewFlags&&claim.reviewFlags.length>0&&<p><small>Manual review needed: {claim.reviewFlags.map(flag=>flag.replaceAll("_"," ")).join(" · ")}.</small></p>}{claim.supportingSourceHosts&&<p><small>Supporting hosts: {claim.supportingSourceHosts.join(", ")}. Manufacturer-domain candidates: {claim.candidateManufacturerHosts?.join(", ")||"none"}.</small></p>}{claim.evidenceQualityScore!==undefined&&<p><small>Evidence review priority: {claim.evidenceQualityScore}/100 · {(claim.evidenceQuality??"review_needed").replaceAll("_"," ")}. This is not a confidence or truth score.</small></p>}{claim.qualityScorePolicy&&<p><small>{claim.qualityScorePolicy}</small></p>}{claim.notes&&<p>{claim.notes}</p>}
      {claim.sourceUrls.length>0 ? (
       <ul>{claim.sourceUrls.map((url,i)=>{
        const source=sourceMap.get(url);
        return <li key={i}>{source ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> : <small>Source URL not found in saved evidence.</small>}</li>;
       })}</ul>
      ) : <p><small>No source links recorded for this claim.</small></p>}
     </li>
    ))}</ul>
   </>
  ) : (
   <p>No structured, source-linked claims were saved for this run. Source URLs alone cannot verify individual fragrance notes.</p>
  )}
 </div>
 )}
 <h4>Execution summary</h4><ul>{report.steps.map((s,i)=><li key={i}><strong>{s.title}</strong> — {s.status}{typeof s.output?.message==="string"?` · ${s.output.message}`:""}</li>)}</ul><p><small>Only recorded execution results are shown. External actions require their configured tools and approvals.</small></p></section>;
}
