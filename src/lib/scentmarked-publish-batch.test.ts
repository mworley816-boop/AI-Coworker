import assert from "node:assert/strict";
import {test} from "node:test";
import {planScentmarkedPublishBatch} from "./scentmarked-publish-batch.ts";
const candidate={sourceVerified:true,duplicateReviewPassed:true,catalogConnectionReady:true,authorizedForAutopublish:true,conflictingExistingData:false,image:{rightsCleared:true,identityVerified:true,storageReady:true}};
test("separates eligible and held perfumes",()=>{
 const plan=planScentmarkedPublishBatch([{id:"a",brand:"House",name:"Scent A",candidate},{id:"b",brand:"House",name:"Scent B",candidate:{...candidate,sourceVerified:false}}]);
 assert.deepEqual(plan.ready.map(x=>x.id),["a"]);
 assert.deepEqual(plan.held[0].reasons,["SOURCE_NOT_VERIFIED"]);
});
test("holds repeated record IDs and incomplete identity",()=>{
 const plan=planScentmarkedPublishBatch([{id:"a",brand:"House",name:"Scent A",candidate},{id:"a",brand:"House",name:"Scent B",candidate},{id:"",brand:"",name:"Scent C",candidate}]);
 assert.deepEqual(plan.held.map(x=>x.reasons[0]),["DUPLICATE_BATCH_ID","MISSING_RECORD_IDENTITY"]);
});
test("rejects unbounded batches",()=>assert.throws(()=>planScentmarkedPublishBatch(Array.from({length:26},(_,i)=>({id:String(i),brand:"H",name:"N",candidate}))),RangeError));
