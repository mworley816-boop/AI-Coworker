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
 for(const sourceUrl of ["http://example.com","https://localhost/path","https://127.0.0.1/path","https://192.168.1.20/path","https://8.8.8.8/path","https://example.com/#fragment","https://user:pass@example.com/path","invalid"]){
  assert.equal(validatePerfumeResearchCandidate({...candidate,sourceUrl}).ok,false);
 }
 assert.equal(validatePerfumeResearchCandidate({...candidate,name:" "}).ok,false);
 assert.equal(validatePerfumeResearchCandidate({...candidate,notes:[""]}).ok,false);
});

test("accepts bounded supporting source records without publishing",()=>{
 const result=validatePerfumeResearchCandidate({...candidate,evidenceSources:[{url:"https://brand.example/product",note:"vanilla"}]});
 assert.equal(result.ok,true);
 if(result.ok)assert.equal(result.candidate.evidenceSources?.length,1);
});
test("rejects invalid supporting source URLs",()=>{
 for(const url of ["http://example.com","https://localhost/path","https://127.0.0.1/path","https://user:pass@example.com","not-a-url"]){
  assert.equal(validatePerfumeResearchCandidate({...candidate,evidenceSources:[{url,note:"vanilla"}]}).ok,false);
 }
});
