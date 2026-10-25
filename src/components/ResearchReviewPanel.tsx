"use client";
import {useState} from "react";
type ReviewItem={claim:string;sourceUrls:string[];reviewUrgency:string;reviewUrgencyReason:string;reviewActions:string[];manualReviewRequired:boolean};
function record(value:unknown):Record<string,unknown>|null{return value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null;}
function reviewQueue(output:Record<string,unknown>|null):ReviewItem[]{
 const root=record(output);
 const candidates=[root,record(root?.data),record(root?.result),record(record(root?.result)?.data),record(root?.toolResult),record(record(root?.toolResult)?.data)];
 for(const candidate of candidates){
  if(!Array.isArray(candidate?.reviewQueue))continue;
  return candidate.reviewQueue.filter((value):value is ReviewItem=>{
   const item=record(value);
   return !!item&&typeof item.claim==="string"&&["high","medium","routine"].includes(String(item.reviewUrgency))
    &&Array.isArray(item.sourceUrls)&&Array.isArray(item.reviewActions)&&item.manualReviewRequired===true;
  });
 }
 return [];
}
export default function ResearchReviewPanel({steps,runId}:{runId:string;steps:{id:string;kind:string;output:Record<string,unknown>|null}[]}){
 const [filter,setFilter]=useState<"all"|"high"|"medium"|"routine">("all");
 const [saving,setSaving]=useState("");
 const [feedback,setFeedback]=useState("");
 async function saveDecision(stepId:string,claim:string,decision:"needs_follow_up"|"reviewed"|"rejected"){
  setSaving(stepId+claim);setFeedback("");
  try{const response=await fetch("/api/research/review-decision",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({runId,stepId,claim,decision})});const result=await response.json() as {ok?:boolean;reason?:string};setFeedback(response.ok&&result.ok?"Review decision recorded in activity log. No catalog changes were made.":result.reason||"Review decision could not be saved.");}
  catch{setFeedback("Review decision could not be saved.");}finally{setSaving("");}
 }
 const items=steps.flatMap(step=>reviewQueue(step.output).map(item=>({...item,stepId:step.id})));
 const visible=items.filter(item=>filter==="all"||item.reviewUrgency===filter);
 const counts={high:items.filter(item=>item.reviewUrgency==="high").length,medium:items.filter(item=>item.reviewUrgency==="medium").length,routine:items.filter(item=>item.reviewUrgency==="routine").length};
 if(!items.length)return null;
 return <section aria-label="Research review queue" className="approval-panel">
  <h4>Research review queue</h4>
  <p>Claims are search-snippet leads, not verified fragrance facts. Review the original pages before approving or publishing.</p>
  <p role="status">{items.length} claims need verification · {counts.high} high · {counts.medium} medium · {counts.routine} routine</p>
  <div role="group" aria-label="Filter claims by review urgency" className="approval-actions">{(["all","high","medium","routine"] as const).map(level=><button key={level} type="button" className={filter===level?"":"secondary"} aria-pressed={filter===level} onClick={()=>setFilter(level)}>{level==="all"?"All":level[0].toUpperCase()+level.slice(1)} ({level==="all"?items.length:counts[level]})</button>)}</div>
  {visible.length===0&&<p>No claims match this filter.</p>}
  {feedback&&<p role="status">{feedback}</p>}
  <ol>{visible.map((item,index)=><li key={item.stepId+":"+index} style={{marginBottom:"1rem"}}>
   <strong>{item.claim}</strong> <small>Review urgency: {item.reviewUrgency}</small>
   <p>{item.reviewUrgencyReason}</p>
   <ul>{item.reviewActions.filter(action=>typeof action==="string").map((action,i)=><li key={i}>{action}</li>)}</ul>
   <p>Sources: {item.sourceUrls.filter(url=>typeof url==="string"&&/^https?:\/\//.test(url)).map((url,i)=><span key={i}><a href={url} target="_blank" rel="noopener noreferrer">{"Source "+(i+1)}</a>{" "}</span>)}</p>
   <small>Manual verification required</small>
   <div className="approval-actions">{(["needs_follow_up","reviewed","rejected"] as const).map(decision=><button type="button" className="secondary" key={decision} disabled={Boolean(saving)} onClick={()=>void saveDecision(item.stepId,item.claim,decision)}>{decision==="needs_follow_up"?"Follow up":decision==="reviewed"?"Mark reviewed":"Reject claim"}</button>)}</div>
  </li>)}</ol>
 </section>;
}
