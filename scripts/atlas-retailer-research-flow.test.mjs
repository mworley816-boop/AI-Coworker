import test from 'node:test';
import assert from 'node:assert/strict';
import { runRetailerResearchToDraft, validateResearchEvidence } from './atlas-retailer-research-flow.mjs';

const candidate = Object.freeze({
  perfume_id: '825873b2-9281-45a9-a05d-d2feb67a6ef5',
  brand: 'Example Brand', perfume_name: 'Example Perfume',
  merchant_name: 'Example Retailer',
  product_url: 'https://retailer.example/products/example',
  source_url: 'https://retailer.example/products/example',
  evidence_note: 'Test fixture only; no actual retailer identity verified.'
});
test('valid evidence fixture is accepted', () => assert.equal(validateResearchEvidence(candidate), null));
test('dry run never submits', async () => {
  let calls = 0;
  const result = await runRetailerResearchToDraft({ research: async () => candidate, submit: async () => { calls++; throw Error('should not submit'); } });
  assert.equal(result.status, 'dry_run');
  assert.equal(result.published, false);
  assert.equal(calls, 0);
});
test('explicit submission calls injected adapter and remains unpublished', async () => {
  let calls = 0;
  const result = await runRetailerResearchToDraft({ research: async () => candidate, allowSubmission: true, submit: async x => { calls++; assert.deepEqual(x, candidate); return { ok: true, status: 'draft_created' }; } });
  assert.equal(result.status, 'draft_created');
  assert.equal(result.published, false);
  assert.equal(calls, 1);
});
test('rejects unsafe URL before submitting', async () => {
  const bad = { ...candidate, product_url: 'http://localhost:3000/private' };
  assert.equal((await runRetailerResearchToDraft({ research: async () => bad, allowSubmission: true, submit: async () => { throw Error('must not submit'); } })).reason, 'invalid_product_url');
});
test('missing research provider fails closed', async () => assert.equal((await runRetailerResearchToDraft()).reason, 'missing_research_provider'));
test('research exceptions do not leak details', async () => assert.equal((await runRetailerResearchToDraft({research:async()=>{throw Error('private')}})).reason,'research_failed'));
