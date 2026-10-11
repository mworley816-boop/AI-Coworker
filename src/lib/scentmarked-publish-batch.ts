import {evaluateAutoPublish,type PublishCandidate} from "./scentmarked-auto-publish-policy";

export type PublishBatchItem={id:string;brand:string;name:string;candidate:PublishCandidate};
export type PublishBatchPlan={ready:{id:string;brand:string;name:string}[];held:{id:string;brand:string;name:string;reasons:string[]}[]};
/** Pure, read-only planning. This does not write catalog records or media. */
export function planScentmarkedPublishBatch(items:PublishBatchItem[],limit=25):PublishBatchPlan{
 if(!Number.isInteger(limit)||limit<1||limit>100)throw new RangeError("Invalid batch size");
 if(items.length>limit)throw new RangeError("Batch exceeds configured limit");
 const seen=new Set<string>();
 const ready:PublishBatchPlan["ready"]=[],held:PublishBatchPlan["held"]=[];
 for(const item of items){
  const id=item.id.trim(),brand=item.brand.trim(),name=item.name.trim();
  const reasons:string[]=[];
  if(!id||!brand||!name)reasons.push("MISSING_RECORD_IDENTITY");
  if(id&&seen.has(id))reasons.push("DUPLICATE_BATCH_ID");
  if(id)seen.add(id);
  const decision=evaluateAutoPublish(item.candidate);
  reasons.push(...decision.reasons);
  if(reasons.length)held.push({id,brand,name,reasons});
  else ready.push({id,brand,name});
 }
 return {ready,held};
}
