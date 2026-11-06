import assert from "node:assert/strict";
import {test} from "node:test";
import type {SupabaseClient} from "@supabase/supabase-js";
import {holdStalePerfumeResearchJobs} from "./scentmarked-perfume-research-job-recovery.ts";
type Row={id:string;owner_user_id:string;status:string;updated_at:string;error_code?:string};
function mock(rows:Row[]){
 let updates=0;
 const client={
  from(){
   return {
    select(){
     const query={
      eq(){return query},
      lt(_key:string,cutoff:string){
       return {
        order(){
         return {
          limit(n:number){
           return Promise.resolve({
            data:rows.filter(r=>r.status==="researching"&&r.updated_at<cutoff).slice(0,n).map(r=>({id:r.id,owner_user_id:r.owner_user_id})),
            error:null
           });
          }
         };
        }
       };
      }
     };
     return query;
    },
    update(patch:Partial<Row>){
     updates++;
     const filters:Record<string,string>={};
     let cutoff="";
     const query={
      eq(key:string,value:string){filters[key]=value;return query},
      lt(_key:string,value:string){cutoff=value;return query},
      select(){return query},
      async maybeSingle(){
       const row=rows.find(r=>r.id===filters.id&&r.owner_user_id===filters.owner_user_id&&r.status===filters.status&&r.updated_at<cutoff);
       if(row)Object.assign(row,patch);
       return {data:row?{id:row.id}:null,error:null};
      }
     };
     return query;
    }
   };
  }
 } as unknown as SupabaseClient;
 return {client,rows,updates:()=>updates};
}
test("invalid recovery bounds never mutate jobs",async()=>{
 const m=mock([]);
 assert.equal((await holdStalePerfumeResearchJobs(m.client,14)).status,"INVALID_AGE");
 assert.equal((await holdStalePerfumeResearchJobs(m.client,30,26)).status,"INVALID_LIMIT");
 assert.equal(m.updates(),0);
});
test("empty recovery does not mutate jobs",async()=>{
 const m=mock([]);
 assert.deepEqual(await holdStalePerfumeResearchJobs(m.client),{ok:true,status:"STALE_JOBS_HELD",held:0});
 assert.equal(m.updates(),0);
});
test("only abandoned researching jobs are held for manual review",async()=>{
 const old=new Date(Date.now()-60*60000).toISOString();
 const recent=new Date().toISOString();
 const m=mock([{id:"old",owner_user_id:"owner",status:"researching",updated_at:old},{id:"new",owner_user_id:"owner",status:"researching",updated_at:recent},{id:"queued",owner_user_id:"owner",status:"queued",updated_at:old}]);
 const result=await holdStalePerfumeResearchJobs(m.client,30,10);
 assert.equal(result.held,1);
 assert.equal(m.rows[0].status,"held");
 assert.equal(m.rows[0].error_code,"STALE_RESEARCH_REVIEW_REQUIRED");
 assert.equal(m.rows[1].status,"researching");
 assert.equal(m.rows[2].status,"queued");
 assert.equal(m.updates(),1);
});
