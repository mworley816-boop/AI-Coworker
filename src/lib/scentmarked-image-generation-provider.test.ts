import assert from "node:assert/strict";
import {test} from "node:test";
import {generateScentmarkedGraphic} from "./scentmarked-image-generation-provider.ts";
const input={prompt:"Original fragrance-inspired abstract editorial artwork",jobId:"job-1"};
test("disabled provider never calls network",async()=>{let called=false;await assert.rejects(()=>generateScentmarkedGraphic(input,{enabled:false,apiKey:"key"},async()=>{called=true;throw Error("unexpected")}),/DISABLED/);assert.equal(called,false)});
test("rejects untrusted endpoints",async()=>assert.rejects(()=>generateScentmarkedGraphic(input,{enabled:true,apiKey:"key",endpoint:"https://example.com/images"}),/INVALID_IMAGE_PROVIDER_ENDPOINT/));
test("rejects malformed image output",async()=>{const fake=async()=>new Response(JSON.stringify({data:[{b64_json:Buffer.from("not png").toString("base64")}]}),{status:200});await assert.rejects(()=>generateScentmarkedGraphic(input,{enabled:true,apiKey:"key"},fake as typeof fetch),/INVALID_GENERATED_PNG/)});
