import assert from "node:assert/strict";
import {test} from "node:test";
import {canReviewGeneratedGraphic} from "./scentmarked-graphic-review-policy.ts";
const id="00000000-0000-4000-8000-000000000125";
const eligible={owner_user_id:"owner",status:"generated",output_storage_path:"generated/"+id+".png"};
test("only the owner can review a generated private graphic",()=>{
 assert.equal(canReviewGeneratedGraphic(eligible,"owner",id),true);
 assert.equal(canReviewGeneratedGraphic(eligible,"other",id),false);
 assert.equal(canReviewGeneratedGraphic(null,"owner",id),false);
});
test("unready jobs and mismatched artifact paths cannot be reviewed",()=>{
 for(const status of ["queued","generating","failed","held","approved"]){
  assert.equal(canReviewGeneratedGraphic({...eligible,status},"owner",id),false);
 }
 for(const path of [null,"","generated/another.png","public/"+id+".png"]){
  assert.equal(canReviewGeneratedGraphic({...eligible,output_storage_path:path},"owner",id),false);
 }
});
