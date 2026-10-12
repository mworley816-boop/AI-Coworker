import assert from "node:assert/strict";
import {test} from "node:test";
import type {SupabaseClient} from "@supabase/supabase-js";
import {processNextScentmarkedGraphicJob} from "./scentmarked-graphic-worker.ts";

test("failed private upload holds job instead of marking it generated",async()=>{
 const id="00000000-0000-4000-8000-000000000124";
 const png=new Uint8Array([137,80,78,71,13,10,26,10,0]);
 let status="queued";let generatedUpdates=0;let uploads=0;
 const client={
  from(){return {
   select(){return {eq(){return {order(){return {limit:async()=>({data:[{id,prompt:"Original graphic"}],error:null})}}}}}},
   update(fields:Record<string,unknown>){
    if(fields.status==="generated")generatedUpdates++;
    return {eq(_field:string,_id:string){return {eq(_statusField:string,expected:string){
     if(status!==expected)return {select(){return {maybeSingle:async()=>({data:null,error:null})}}};
     status=String(fields.status);
     return {select(){return {maybeSingle:async()=>({data:{id},error:null})}},then(resolve:(v:{error:null})=>unknown){return Promise.resolve(resolve({error:null}))}};
    }}}};
   }
  }},
  rpc:async()=>({data:true,error:null}),
  storage:{getBucket:async()=>({data:{public:false},error:null}),from(){return {upload:async()=>{uploads++;return {error:{message:"storage unavailable"}}}}}}
 };
 const result=await processNextScentmarkedGraphicJob(client as unknown as SupabaseClient,{enabled:true,apiKey:"test"},async()=>({bytes:png,contentType:"image/png",providerJobId:id}));
 assert.equal(result.ok,false);
 assert.equal(result.status,"ARTIFACT_STORAGE_FAILED");
 assert.equal(status,"held");
 assert.equal(generatedUpdates,0);
 assert.equal(uploads,1);
});
