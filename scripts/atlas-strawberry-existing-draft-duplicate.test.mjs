import test from 'node:test';
import assert from 'node:assert/strict';
import {runRetailerResearchToDraft} from './atlas-retailer-research-flow.mjs';
import {submitRetailerCandidate} from './atlas-retailer-submission.mjs';

const candidate = {
  perfume_id:'7712723c-9121-437c-a2f3-d1ee2c37f524',
  brand:'Arabiyat Sugar',
  perfume_name:'Strawberry Tres Leches',
  merchant_name:'Auroud Perfumes',
  product_url:'https://auroudperfumes.com/products/arabiyat-sugar-strawberry-tred-leches-eau-de-parfum-3-4fl-oz',
  source_url:'https://auroudperfumes.com/products/arabiyat-sugar-strawberry-tred-leches-eau-de-parfum-3-4fl-oz',
  evidence_note:'Retailer listing for 100 mL Eau de Parfum; existing inactive offer must not be duplicated.',
  bottle_size_ml:100,
  concentration:'Eau de Parfum'
};
test('existing Strawberry Tres Leches offer: simulated API duplicate is never published',async()=>{
  let calls=0;
  const env={
    SCENTMARKED_RETAILER_INTAKE_URL:'https://scentmarked.m-worley816.workers.dev/api/atlas/retailer-candidates',
    ATLAS_RETAILER_INTAKE_SECRET:'test-only-not-a-real-credential-000000000'
  };
  const result=await runRetailerResearchToDraft({
    research:async()=>candidate,
    env,
    allowSubmission:true,
    submit:(item,config)=>submitRetailerCandidate(item,config,{fetch:async(_url,request)=>{
      calls++;
      assert.equal(request.method,'POST');
      assert.equal(JSON.parse(request.body).perfume_id,candidate.perfume_id);
      return {status:409};
    }})
  });
  assert.equal(calls,1);
  assert.deepEqual(result,{ok:false,reason:'duplicate',published:false});
});
