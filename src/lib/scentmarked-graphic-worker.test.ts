import assert from "node:assert/strict";
import {test} from "node:test";
import {processNextScentmarkedGraphicJob} from "./scentmarked-graphic-worker.ts";
import type {SupabaseClient} from "@supabase/supabase-js";
const queued={id:"00000000-0000-4000-8000-000000000001",prompt:"Original floral illustration",status:"queued"};
function clientForQuota(reservation:boolean|null,error:unknown=null){
 let claimed=false;
 const client={
  from(table:string){
   assert.equal(table,"scentmarked_graphic_jobs");
   return {select(){return {eq(){return {order(){return {limit:async()=>({data:[queued],error:null})}}}}}}};
  },
  storage:{getBucket:async()=>({data:{public:false},error:null})},
  rpc:async(name:string,args:{p_count:number;p_limit:number})=>{assert.equal(name,"atlas_reserve_graphic_daily_quota");assert.equal(args.p_count,1);assert.equal(args.p_limit,5);return {data:reservation,error};}
 };
 return {client:client as unknown as SupabaseClient,wasClaimed:()=>claimed};
}
test("quota exhaustion blocks generation before claim or provider request",async()=>{
 const {client}=clientForQuota(false);
 let calls=0;
 const result=await processNextScentmarkedGraphicJob(client,{enabled:true,apiKey:"test"},async()=>{calls++;throw Error("should not run")});
 assert.equal(result.status,"DAILY_QUOTA_EXCEEDED");assert.equal(result.ok,false);assert.equal(calls,0);
});
test("quota database failure fails closed without provider request",async()=>{
 const {client}=clientForQuota(null,{message:"database unavailable"});
 let calls=0;
 const result=await processNextScentmarkedGraphicJob(client,{enabled:true,apiKey:"test"},async()=>{calls++;throw Error("should not run")});
 assert.equal(result.status,"DAILY_QUOTA_UNAVAILABLE");assert.equal(result.ok,false);assert.equal(calls,0);
});
test("disabled worker never looks up queued jobs",async()=>{
 const result=await processNextScentmarkedGraphicJob({} as SupabaseClient,{enabled:false,apiKey:"test"});
 assert.equal(result.status,"WORKER_DISABLED");
});
