import {test} from "node:test";
import {strict as assert} from "node:assert";
import {assessGraphicsProviderConfig} from "./provider-readiness";
test("graphics readiness fails closed with no configuration",()=>{
 const r=assessGraphicsProviderConfig({});
 assert.equal(r.generationEnabled,false);
 assert.equal(r.checks.length,4);
 assert.equal(r.missing.length,4);
});
test("graphics readiness reports complete configuration without claiming provider validation",()=>{
 const r=assessGraphicsProviderConfig({ATLAS_GRAPHICS_PROVIDER:"openai",OPENAI_API_KEY:"secret",ATLAS_TRUSTED_IMAGE_ORIGIN:"https://images.example.com",ATLAS_GRAPHICS_GENERATION_ENABLED:"true"});
 assert.equal(r.generationEnabled,true);
 assert.match(r.checks[1].detail,/not validated/);
 assert.equal(JSON.stringify(r).includes("secret"),false);
});
test("graphics readiness rejects local and non-HTTPS image origins",()=>{
 for(const origin of ["http://images.example.com","https://localhost","https://127.0.0.1"]){
  const r=assessGraphicsProviderConfig({ATLAS_GRAPHICS_PROVIDER:"openai",OPENAI_API_KEY:"secret",ATLAS_TRUSTED_IMAGE_ORIGIN:origin,ATLAS_GRAPHICS_GENERATION_ENABLED:"true"});
  assert.equal(r.generationEnabled,false);
 }
});

test("private R2 binding satisfies image source without public origin",()=>{
 const r=assessGraphicsProviderConfig({ATLAS_GRAPHICS_PROVIDER:"openai",OPENAI_API_KEY:"secret",ATLAS_GRAPHICS_GENERATION_ENABLED:"true"},true);
 assert.equal(r.generationEnabled,true);
 assert.match(r.checks[2].detail,/Private R2/);
});
test("missing R2 binding and public origin blocks generation",()=>{
 const r=assessGraphicsProviderConfig({ATLAS_GRAPHICS_PROVIDER:"openai",OPENAI_API_KEY:"secret",ATLAS_GRAPHICS_GENERATION_ENABLED:"true"},false);
 assert.equal(r.generationEnabled,false);
 assert.equal(r.checks[2].ready,false);
});
