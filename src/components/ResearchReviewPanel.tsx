"use client";
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
export default function ResearchReviewPanel({steps}:{steps:{id:string;kind:string;output:Record<string,unknown>|null}[]}){
 const items=steps.flatMap(step=>reviewQueue(step.output).map(item=>({...item,stepId:step.id})));
 if(!items.length)return null;
 return <section aria-label="Research review queue" className="approval-panel">
  <h4>Research review queue</h4>
  <p>Claims are search-snippet leads, not verified fragrance facts. Review the original pages before approving or publishing.</p>
  <ol>{items.map((item,index)=><li key={item.stepId+":"+index} style={{marginBottom:"1rem"}}>
   <strong>{item.claim}</strong> <small>Review urgency: {item.reviewUrgency}</small>
   <p>{item.reviewUrgencyReason}</p>
   <ul>{item.reviewActions.filter(action=>typeof action==="string").map((action,i)=><li key={i}>{action}</li>)}</ul>
   <p>Sources: {item.sourceUrls.filter(url=>typeof url==="string"&&/^https?:\/\//.test(url)).map((url,i)=><span key={i}><a href={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname}</a>{" "}</span>)}</p>
   <small>Manual verification required</small>
  </li>)}</ol>
 </section>;
}
