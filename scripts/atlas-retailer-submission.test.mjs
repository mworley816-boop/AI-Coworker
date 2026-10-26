import test from 'node:test';
import assert from 'node:assert/strict';
import {submitRetailerCandidate} from './atlas-retailer-submission.mjs';

const url='https://scentmarked.m-worley816.workers.dev/api/atlas/retailer-candidates';
const secret='x'.repeat(40);
const candidate={perfume_id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',merchant_name:'Retailer'};
test('rejects missing credential before request',async()=>{
 let calls=0;
 const result=await submitRetailerCandidate(candidate,{SCENTMARKED_RETAILER_INTAKE_URL:url},{fetch:async()=>{calls++;return {status:201}}});
 assert.equal(result.reason,'missing_secret');assert.equal(calls,0);
});
test('rejects untrusted destination',async()=>{
 const result=await submitRetailerCandidate(candidate,{SCENTMARKED_RETAILER_INTAKE_URL:'https://evil.example/api/atlas/retailer-candidates',ATLAS_RETAILER_INTAKE_SECRET:secret});
 assert.equal(result.reason,'untrusted_destination');
});
test('submits server-side draft with auth',async()=>{
 const result=await submitRetailerCandidate(candidate,{SCENTMARKED_RETAILER_INTAKE_URL:url,ATLAS_RETAILER_INTAKE_SECRET:secret},{fetch:async (target,init)=>{
 assert.equal(target,url);assert.equal(init.method,'POST');assert.equal(init.headers.Authorization,'Bearer '+secret);assert.equal(JSON.parse(init.body).merchant_name,'Retailer');
 return {status:201};
 }});
 assert.deepEqual(result,{ok:true,status:'draft_created'});
});
test('does not follow redirects',async()=>{
 const result=await submitRetailerCandidate(candidate,{SCENTMARKED_RETAILER_INTAKE_URL:url,ATLAS_RETAILER_INTAKE_SECRET:secret},{fetch:async(_url,init)=>{assert.equal(init.redirect,'manual');return {status:302}}});
 assert.equal(result.reason,'upstream_error');
});
test('handles duplicates without publishing',async()=>{
 const result=await submitRetailerCandidate(candidate,{SCENTMARKED_RETAILER_INTAKE_URL:url,ATLAS_RETAILER_INTAKE_SECRET:secret},{fetch:async()=>({status:409})});
 assert.equal(result.reason,'duplicate');
});
