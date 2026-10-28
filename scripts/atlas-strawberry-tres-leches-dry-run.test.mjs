import test from 'node:test';
import assert from 'node:assert/strict';
import { runRetailerResearchToDraft } from './atlas-retailer-research-flow.mjs';

// Public research candidate; NO secrets and NO live submission.
// Listing must be rechecked before any real API write.
const candidate = {
  perfume_id: '7712723c-9121-437c-a2f3-d1ee2c37f524',
  brand: 'Arabiyat Sugar',
  perfume_name: 'Strawberry Tres Leches',
  merchant_name: 'Auroud Perfumes',
  product_url: 'https://auroudperfumes.com/products/arabiyat-sugar-strawberry-tred-leches-eau-de-parfum-3-4fl-oz',
  source_url: 'https://auroudperfumes.com/products/arabiyat-sugar-strawberry-tred-leches-eau-de-parfum-3-4fl-oz',
  bottle_size_ml: 100,
  concentration: 'Eau de Parfum',
  evidence_note: 'Auroud product page identifies Arabiyat Sugar Strawberry Tres Leches Eau de Parfum, 100 mL. Retailer listing observed 2026-10-28; identity and availability require review before live submission.'
};

test('real catalog candidate stays dry-run only', async () => {
  let submissions = 0;
  const result = await runRetailerResearchToDraft({
    research: async () => candidate,
    submit: async () => { submissions++; throw Error('live submission must not occur'); }
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, 'dry_run');
  assert.equal(result.published, false);
  assert.equal(result.candidate.perfume_id, candidate.perfume_id);
  assert.equal(submissions, 0);
});
