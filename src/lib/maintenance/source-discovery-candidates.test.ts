import assert from "node:assert/strict";
import {test} from "node:test";
import {screenDiscoveredManufacturerUrls} from "../research/source-discovery-candidates.ts";
test("accepts only allowlisted manufacturer links without verification",()=>{
 const result=screenDiscoveredManufacturerUrls("Lattafa",[
  "https://lattafa.com/perfume",
  "https://lattafa.com/perfume",
  "https://lattafa.com.evil.example/perfume",
  "http://lattafa.com/perfume",
  "https://lattafa.com:8443/perfume"
 ]);
 assert.equal(result.accepted.length,1);
 assert.equal(result.rejected.length,3);
 assert.equal(result.accepted[0].sourceVerified,false);
 assert.equal(result.accepted[0].manualReviewRequired,true);
});
test("rejects mismatched house and caps batch size",()=>{
 assert.equal(screenDiscoveredManufacturerUrls("Arabiyat",["https://lattafa.com/item"]).accepted.length,0);
 assert.equal(screenDiscoveredManufacturerUrls("Lattafa",Array.from({length:40},(_,i)=>"https://lattafa.com/item/"+i)).accepted.length,30);
});
