import assert from "node:assert/strict";
import {test} from "node:test";
import {extractPerfumeFacts} from "./scentmarked-perfume-source-extract.ts";
test("extracts product JSON-LD name and explicit notes",()=>{
 const html='<script type="application/ld+json">'+JSON.stringify({"@type":"Product",name:"Vanilla Test",additionalProperty:[{name:"Top notes",value:"Cherry, Almond"},{name:"Base notes",value:"Vanilla; Amber"}]})+"</script>";
 assert.deepEqual(extractPerfumeFacts(html),{name:"Vanilla Test",notes:["Cherry","Almond","Vanilla","Amber"],evidence:"jsonld"});
});
test("does not invent notes from unrelated content",()=>{
 assert.deepEqual(extractPerfumeFacts("<h1>Vanilla</h1>"),{name:null,notes:[],evidence:"none"});
 assert.deepEqual(extractPerfumeFacts('<script type="application/ld+json">{"@type":"Article","name":"Test"}</script>'),{name:null,notes:[],evidence:"none"});
});
