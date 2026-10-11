import assert from "node:assert/strict";
import {test} from "node:test";
import {generateScentmarkedGraphic} from "./scentmarked-image-generation-provider.ts";
test("GPT image request uses supported PNG output format",async()=>{
 let called=0;
 const fake=async (_url:RequestInfo|URL,init?:RequestInit)=>{
  called++;
  const body=JSON.parse(String(init?.body));
  assert.equal(body.model,"gpt-image-1");
  assert.equal(body.output_format,"png");
  assert.equal("response_format" in body,false);
  assert.equal(body.size,"1024x1024");
  return new Response(JSON.stringify({data:[{b64_json:Buffer.from([137,80,78,71,13,10,26,10,0]).toString("base64")}]}),{status:200});
 };
 const result=await generateScentmarkedGraphic({jobId:"test-job",prompt:"Original perfume-inspired floral artwork"},{apiKey:"test",enabled:true},fake as typeof fetch);
 assert.equal(called,1);assert.equal(result.contentType,"image/png");
});
