import assert from "node:assert/strict";
import {test} from "node:test";
import {researchPerfumeSource} from "./scentmarked-perfume-source-research.ts";
function fakePage(name:string,notes?:string){
 const json={"@type":"Product",name,additionalProperty:notes?[{name:"Top notes",value:notes}]:[]};
 return (async()=>new Response('<script type="application/ld+json">'+JSON.stringify(json)+"</script>",{headers:{"content-type":"text/html"}})) as typeof fetch;
}
test("returns review-only sourced candidate",async()=>{
 const result=await researchPerfumeSource("Lattafa","Vanilla Test","https://lattafa.com/test",fakePage("Vanilla Test","Cherry, Vanilla"));
 assert.equal(result.ok,true);
 if(result.ok)assert.deepEqual(result.candidate.notes,["Cherry","Vanilla"]);
});
test("fails closed for wrong product and missing notes",async()=>{
 assert.deepEqual(await researchPerfumeSource("Lattafa","Expected","https://lattafa.com/test",fakePage("Other","Vanilla")),{ok:false,reason:"PRODUCT_NAME_MISMATCH"});
 assert.deepEqual(await researchPerfumeSource("Lattafa","Expected","https://lattafa.com/test",fakePage("Expected")),{ok:false,reason:"NO_EXPLICIT_FRAGRANCE_NOTES"});
});

test("extracts labeled visible notes while retaining JSON-LD product identity",async()=>{
 const html='<script type="application/ld+json">{"@type":"Product","name":"Vanilla Test"}</script><h2>Fragrance Notes:</h2><p>Top: Cherry, Almond</p><p>Heart: Vanilla, Cream</p><p>Base: Amber, Musk</p>';
 const fetcher=(async()=>new Response(html,{headers:{"content-type":"text/html"}})) as typeof fetch;
 const result=await researchPerfumeSource("Lattafa","Vanilla Test","https://lattafa.com/test",fetcher);
 assert.equal(result.ok,true);
 if(result.ok)assert.deepEqual(result.candidate.notes,["Cherry","Almond","Vanilla","Cream","Amber","Musk"]);
});
test("visible notes cannot bypass structured product identity",async()=>{
 const html='<h2>Fragrance Notes:</h2><p>Top: Cherry</p><p>Heart: Vanilla</p>';
 const fetcher=(async()=>new Response(html,{headers:{"content-type":"text/html"}})) as typeof fetch;
 assert.deepEqual(await researchPerfumeSource("Lattafa","Vanilla Test","https://lattafa.com/test",fetcher),{ok:false,reason:"NO_STRUCTURED_PRODUCT"});
});
