import assert from "node:assert/strict";
import {test} from "node:test";
import {diagnosePerfumeExtraction} from "./scentmarked-perfume-extraction-diagnostics.ts";
function page(obj:unknown){return '<script type="application/ld+json">'+JSON.stringify(obj)+"</script>"}
test("reports missing schema separately from missing fragrance notes",()=>{
 assert.deepEqual(diagnosePerfumeExtraction("<h1>Test</h1>"),{status:"no_product_schema",productName:null,noteCount:0});
 assert.deepEqual(diagnosePerfumeExtraction(page({"@type":"Product",name:"Test"})),{status:"no_explicit_notes",productName:"Test",noteCount:0});
});
test("counts only explicit structured fragrance notes",()=>{
 const result=diagnosePerfumeExtraction(page({"@type":"Product",name:"Test",additionalProperty:[{name:"Top notes",value:"Cherry, Almond"}]}));
 assert.deepEqual(result,{status:"ready",productName:"Test",noteCount:2});
});
