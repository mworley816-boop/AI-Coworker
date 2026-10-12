import assert from "node:assert/strict";
import {test} from "node:test";
import {extractExplicitMetaNotes} from "./scentmarked-perfume-html-meta-notes.ts";
import {extractPerfumeFacts} from "./scentmarked-perfume-source-extract.ts";
test("extracts only explicitly labeled note meta tags",()=>{
 const html='<meta name="top-notes" content="Cherry, Almond"><meta property="base_notes" content="Vanilla; Amber"><meta name="description" content="Rose, Musk">';
 assert.deepEqual(extractExplicitMetaNotes(html),["Cherry","Almond","Vanilla","Amber"]);
});
test("falls back to meta notes only with a structured Product identity",()=>{
 const json='<script type="application/ld+json">{"@type":"Product","name":"Vanilla Test"}</script>';
 assert.deepEqual(extractPerfumeFacts(json+'<meta name="top-notes" content="Cherry, Vanilla">'),{name:"Vanilla Test",notes:["Cherry","Vanilla"],evidence:"jsonld+meta"});
 assert.deepEqual(extractPerfumeFacts('<meta name="top-notes" content="Cherry">'),{name:null,notes:[],evidence:"none"});
});
