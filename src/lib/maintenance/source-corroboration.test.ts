import test from "node:test";
import assert from "node:assert/strict";
import {summarizeSourceCorroboration} from "../research/source-corroboration.ts";
test("different pages on one host do not count as independent hosts",()=>{
 const result=summarizeSourceCorroboration([{url:"https://www.example.com/a",note:"vanilla"},{url:"https://example.com/b",note:"vanilla"}]);
 assert.equal(result.distinctHostCount,1);
 assert.equal(result.hasMultipleHosts,false);
 assert.equal(result.manualReviewRequired,true);
});
test("multiple hosts are flagged for review, not auto verification",()=>{
 const result=summarizeSourceCorroboration([{url:"https://brand.example/a",note:"vanilla"},{url:"https://shop.example/b",note:"vanilla"}]);
 assert.equal(result.distinctHostCount,2);
 assert.equal(result.hasMultipleHosts,true);
 assert.equal(result.manualReviewRequired,true);
});
test("invalid sources do not count",()=>{
 const result=summarizeSourceCorroboration([{url:"http://example.com",note:"vanilla"},{url:"https://example.com",note:""}]);
 assert.equal(result.validSourceCount,0);
 assert.deepEqual(result.invalidSourceIndices,[0,1]);
});

test("repeated evidence URLs are flagged without being treated as independent corroboration",()=>{
 const result=summarizeSourceCorroboration([{url:"https://brand.example/item",note:"vanilla"},{url:"https://brand.example/item",note:"vanilla again"}]);
 assert.deepEqual(result.duplicateSourceIndices,[1]);
 assert.equal(result.distinctHostCount,1);
 assert.equal(result.manualReviewRequired,true);
});
