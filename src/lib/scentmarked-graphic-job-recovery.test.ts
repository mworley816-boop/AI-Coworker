import assert from "node:assert/strict";
import {test} from "node:test";
import {holdStaleGraphicJobs} from "./scentmarked-graphic-job-recovery.ts";
import type {SupabaseClient} from "@supabase/supabase-js";
type Row={id:string;status:string;updated_at:string;error_code?:string};
function mock(rows:Row[]){
 let selectCalls=0;let updateCalls=0;
 const table={
  select(){selectCalls++;return this},
  eq(key:string,value:string){if(key==="status")this._status=value;else if(key==="id")this._id=value;return this},
  lt(_key:string,value:string){this._cutoff=value;return this},
  order(){return this},
  limit(n:number){return Promise.resolve({data:rows.filter(r=>r.status==="generating"&&r.updated_at<this._cutoff).slice(0,n).map(r=>({id:r.id})),error:null})},
  update(patch:Partial<Row>){updateCalls++;this._patch=patch;return this},
  selectUpdate(){return this},
  async maybeSingle(){const row=rows.find(r=>r.id===this._id&&r.status==="generating"&&r.updated_at<this._cutoff);if(row)Object.assign(row,this._patch);return {data:row?{id:row.id}:null,error:null}},
  _status:"",_id:"",_cutoff:"",_patch:{} as Partial<Row>
 };
 // Supabase's update().eq().select().maybeSingle() uses the same select method.
 const client={from(){return {select(){return table},update(patch:Partial<Row>){updateCalls++;return {eq(key:string,value:string){table.eq(key,value);return this},lt(key:string,value:string){table.lt(key,value);return this},select(){return {maybeSingle:()=>table.maybeSingle()}}};}}}} as unknown as SupabaseClient;
 return {client,counts:()=>({selectCalls,updateCalls}),rows};
}
test("invalid recovery bounds do not access database",async()=>{
 const m=mock([]);assert.equal((await holdStaleGraphicJobs(m.client,1)).status,"INVALID_AGE");assert.equal((await holdStaleGraphicJobs(m.client,30,26)).status,"INVALID_LIMIT");assert.equal(m.counts().updateCalls,0);
});
test("empty recovery leaves all jobs unchanged",async()=>{
 const m=mock([]);const result=await holdStaleGraphicJobs(m.client);assert.deepEqual(result,{ok:true,status:"STALE_JOBS_HELD",held:0});assert.equal(m.counts().updateCalls,0);
});
test("only stale generating jobs are held without retrying",async()=>{
 const old=new Date(Date.now()-60*60000).toISOString(),recent=new Date().toISOString();
 const m=mock([{id:"old",status:"generating",updated_at:old},{id:"new",status:"generating",updated_at:recent},{id:"queued",status:"queued",updated_at:old}]);
 const result=await holdStaleGraphicJobs(m.client,30,10);
 assert.equal(result.held,1);assert.equal(m.rows[0].status,"held");assert.equal(m.rows[0].error_code,"STALE_GENERATION_REVIEW_REQUIRED");assert.equal(m.rows[1].status,"generating");assert.equal(m.rows[2].status,"queued");assert.equal(m.counts().updateCalls,1);
});
