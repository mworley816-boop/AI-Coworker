"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
type Step={title:string;status:string;kind?:string;output:Record<string,unknown>|null};
type Source={title:string;url:string;snippet:string};
type StoredReport={summary?:string;deliverable?:unknown;sources?:unknown};
function safeSource(item:unknown):Source|null{
 if(!item||typeof item!=="object"||Array.isArray(item))return null;
 const row=item as Record<string,unknown>;
 if(typeof row.url!=="string")return null;
 let url:URL;try{url=new URL(row.url);}catch{return null;}
 if(!["https:","http:"].includes(url.protocol)||url.username||url.password)return null;
 const host=url.hostname.toLowerCase();
 if(!host||host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local")||host.endsWith(".internal")||host==="127.0.0.1"||host==="::1"||/^(?:10|127|169\\.254|192\\.168)\\./.test(host)||/^172\\.(?:1[6-9]|2\\d|3[01])\\./.test(host))return null;
 return {url:url.toString(),title:typeof row.title==="string"?row.title.slice(0,240):host,snippet:typeof row.snippet==="string"?row.snippet.slice(0,800):""};
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
 const seen=new Set<string>();const sources=sourceCandidates.filter(s=>{if(seen.has(s.url))return false;seen.add(s.url);return true;}).slice(0,30);
 const researchCompleted=report.steps.some(s=>s.kind==="research"&&s.status==="completed");
 return <section className="completion-report"><h4>Run report · {report.status}</h4><p>{report.stored?.summary??`${completed.length} of ${report.steps.length} planned steps completed.`}</p>
 {deliverable&&<div><h4>Finished deliverable</h4><p style={{whiteSpace:"pre-wrap"}}>{deliverable}</p></div>}
 {(sources.length>0||researchCompleted)&&<div><h4>Research evidence</h4>{sources.length>0?<><p>{sources.length} recorded source link{sources.length===1?"":"s"}. Search results are unverified until reviewed.</p><ul>{sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>{s.snippet&&<p>{s.snippet}</p>}<small>Unverified source</small></li>)}</ul></>:<p>Research completed, but no source URLs were found in the stored report or research step output. Evidence may not have been persisted; this run cannot be source-verified from the report.</p>}</div>}
 <h4>Execution summary</h4><ul>{report.steps.map((s,i)=><li key={i}><strong>{s.title}</strong> — {s.status}{typeof s.output?.message==="string"?` · ${s.output.message}`:""}</li>)}</ul><p><small>Only recorded execution results are shown. External actions require their configured tools and approvals.</small></p></section>;
}
