import assert from "node:assert/strict";
import {test} from "node:test";
import {validatePerfumeResearchCandidate} from "./scentmarked-perfume-research-policy.ts";
const candidate={house:"Arabiyat",name:"Sample perfume",sourceUrl:"https://example.com/perfume",sourceType:"manufacturer" as const,notes:["vanilla","amber","vanilla"]};
test("normalizes sourced perfume research without publishing",()=>{
 const result=validatePerfumeResearchCandidate(candidate);
 assert.equal(result.ok,true);
 if(result.ok)assert.deepEqual(result.candidate.notes,["vanilla","amber"]);
});
test("rejects unsafe source URLs and unverified fields",()=>{
 for(const sourceUrl of ["http://example.com","https://localhost/path","https://127.0.0.1/path","https://example.com/#fragment","https://user:pass@example.com/path","invalid"]){
  assert.equal(validatePerfumeResearchCandidate({...candidate,sourceUrl}).ok,false);
 }
 assert.equal(validatePerfumeResearchCandidate({...candidate,name:" "}).ok,false);
 assert.equal(validatePerfumeResearchCandidate({...candidate,notes:[""]}).ok,false);
});
