import assert from "node:assert/strict";
import {test} from "node:test";
import {fetchPerfumeSourcePage} from "./scentmarked-perfume-source-fetch.ts";
test("retrieves bounded HTML from allowlisted source",async()=>{
 const fake=(async()=>new Response("<html>vanilla</html>",{headers:{"content-type":"text/html"}})) as typeof fetch;
 const result=await fetchPerfumeSourcePage("Lattafa","https://lattafa.com/test",fake);
 assert.equal(result.ok,true);
 if(result.ok)assert.match(result.html,/vanilla/);
});
test("rejects oversized bodies and unexpected mime",async()=>{
 const huge=(async()=>new Response("x".repeat(250001),{headers:{"content-type":"text/html"}})) as typeof fetch;
 assert.equal((await fetchPerfumeSourcePage("Lattafa","https://lattafa.com/test",huge)).ok,false);
 const json=(async()=>new Response("{}",{headers:{"content-type":"application/json"}})) as typeof fetch;
 assert.equal((await fetchPerfumeSourcePage("Lattafa","https://lattafa.com/test",json)).ok,false);
});
test("does not fetch unlisted sources",async()=>{
 let called=false;
 const fake=(async()=>{called=true;return new Response("bad")}) as typeof fetch;
 assert.equal((await fetchPerfumeSourcePage("Lattafa","https://evil.example/test",fake)).ok,false);
 assert.equal(called,false);
});
