import assert from "node:assert/strict";
import {test} from "node:test";
import {classifyPerfumeSource} from "./scentmarked-perfume-source-registry.ts";
test("matches exact manufacturer domain and subdomains without claiming verification",()=>{
 assert.deepEqual(classifyPerfumeSource("Lattafa","https://lattafa.com/perfumes"),{type:"manufacturer",host:"lattafa.com",verified:false});
 assert.deepEqual(classifyPerfumeSource("Arabiyat","https://shop.arabiyat.com/"),{type:"manufacturer",host:"shop.arabiyat.com",verified:false});
});
test("rejects lookalikes, insecure URLs and wrong house",()=>{
 for(const url of ["https://lattafa.com.evil.example/x","https://notlattafa.com/","http://lattafa.com/","https://lattafa.com@evil.example/"])assert.equal(classifyPerfumeSource("Lattafa",url),null);
 assert.equal(classifyPerfumeSource("Arabiyat","https://lattafa.com/"),null);
});
