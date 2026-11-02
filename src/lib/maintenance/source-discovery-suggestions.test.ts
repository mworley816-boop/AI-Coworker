import assert from "node:assert/strict";
import {test} from "node:test";
import {suggestManufacturerResearchSearches} from "../research/source-discovery-suggestions.ts";
test("suggests reviewed manufacturer hosts without claiming verification",()=>{
 const suggestions=suggestManufacturerResearchSearches("Arabiyat","Strawberry Tres Leches");
 assert.equal(suggestions.length,1);
 assert.equal(suggestions[0].host,"myperfumes.ae");
 assert.equal(suggestions[0].sourceVerified,false);
 assert.equal(suggestions[0].manualReviewRequired,true);
 assert.match(suggestions[0].query,/site:myperfumes.ae/);
});
test("unknown houses and blank identities have no suggestions",()=>{
 assert.deepEqual(suggestManufacturerResearchSearches("Unknown","Sample"),[]);
 assert.deepEqual(suggestManufacturerResearchSearches("Arabiyat"," "),[]);
});
test("strips quote and control characters from search terms",()=>{
 const [result]=suggestManufacturerResearchSearches("Lattafa",'Vanilla "28"\\nAmber');
 assert.equal(result.query,'site:lattafa.com "Lattafa" "Vanilla 28 Amber"');
});
