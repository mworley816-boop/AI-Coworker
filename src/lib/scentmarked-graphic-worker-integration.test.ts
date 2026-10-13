import assert from "node:assert/strict";
import {test} from "node:test";
import type {SupabaseClient} from "@supabase/supabase-js";
import {processNextScentmarkedGraphicJob} from "./scentmarked-graphic-worker.ts";

test("worker stores mocked PNG privately and records generated status",async()=>{
 const id="00000000-0000-4000-8000-000000000123";
 const png=new Uint8Array([137,80,78,71,13,10,26,10,0]);
 let status="queued";let providerCalls=0;let uploadCalls=0;let quotaCalls=0;
 const client={
  from(table:string){
   assert.equal(table,"scentmarked_graphic_jobs");
   return {
    select(){return {eq(field:string,value:string){assert.equal(field,"status");assert.equal(value,"queued");return {order(){return {limit:async()=>({data:[{id,prompt:"Original floral graphic",status}],error:null})}}}}}},
    update(fields:Record<string,unknown>){
     return {eq(field:string,value:string){
      assert.equal(field,"id");assert.equal(value,id);
      return {eq(_field:string,expected:string){
       if(status!==expected)return {select(){return {maybeSingle:async()=>({data:null,error:null})}}};
       status=String(fields.status);
       return {select(){return {maybeSingle:async()=>({data:{id},error:null})}},then(resolve:(v:{error:null})=>unknown){return Promise.resolve(resolve({error:null}))}};
      }};
     }};
    }
   };
  },
  rpc:async()=>{quotaCalls++;return {data:true,error:null}},
  storage:{
   getBucket:async()=>({data:{public:false},error:null}),
   from(bucket:string){assert.equal(bucket,"atlas-graphic-artifacts");return {upload:async(path:string,bytes:Uint8Array,opts:{upsert:boolean})=>{uploadCalls++;assert.equal(path,"generated/"+id+".png");assert.equal(opts.upsert,false);assert.deepEqual(bytes,png);return {error:null}}}}
  }
 };
 const result=await processNextScentmarkedGraphicJob(client as unknown as SupabaseClient,{enabled:true,apiKey:"test"},async()=>{providerCalls++;return {bytes:png,contentType:"image/png",providerJobId:id}});
 assert.equal(result.ok,true);assert.equal(result.status,"GENERATED_PRIVATE_ARTIFACT");
 assert.equal(status,"generated");assert.equal(quotaCalls,1);assert.equal(providerCalls,1);assert.equal(uploadCalls,1);
});
