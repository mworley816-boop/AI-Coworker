import assert from "node:assert/strict";
import {test} from "node:test";
import {planPerfumeSourceRetrieval} from "./scentmarked-perfume-source-retrieval-policy.ts";
test("allows bounded HTTPS source retrieval with redirects disabled",()=>{
 assert.deepEqual(planPerfumeSourceRetrieval("Lattafa","https://lattafa.com/products/test"),{ok:true,url:"https://lattafa.com/products/test",maxBytes:250000,redirect:"error"});
});
test("rejects unlisted, redirected-target, and nonstandard-port destinations",()=>{
 for(const url of ["https://lattafa.com.evil.example/","https://lattafa.com:8443/","https://lattafa.com/#section","http://lattafa.com/"])assert.equal(planPerfumeSourceRetrieval("Lattafa",url).ok,false);
});
