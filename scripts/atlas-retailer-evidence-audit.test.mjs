import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRetailerEvidenceAudit} from './atlas-retailer-evidence-audit.mjs';
const candidate={
 perfume_id:'7712723c-9121-437c-a2f3-d1ee2c37f524',
 brand:'Arabiyat Sugar',perfume_name:'Strawberry Tres Leches',
 merchant_name:'Auroud Perfumes',
 product_url:'https://auroudperfumes.com/products/arabiyat-sugar-strawberry-tred-leches-eau-de-parfum-3-4fl-oz',
 source_url:'https://auroudperfumes.com/products/arabiyat-sugar-strawberry-tred-leches-eau-de-parfum-3-4fl-oz',
 evidence_note:'Product listing names Arabiyat Sugar Strawberry Tres Leches EDP 100 mL.'
};
test('creates approval-gated evidence for the existing inactive offer',()=>{
 const result=buildRetailerEvidenceAudit(candidate,'duplicate','2026-10-28T11:00:00Z');
 assert.equal(result.ok,true);
 assert.equal(result.record.published,false);
 assert.equal(result.record.requires_admin_approval,true);
 assert.equal(result.record.outcome,'duplicate');
 assert.equal(result.record.perfume_id,candidate.perfume_id);
 assert.equal(Object.hasOwn(result.record,'ATLAS_RETAILER_INTAKE_SECRET'),false);
});
test('rejects invalid evidence and unrecognized outcomes',()=>{
 assert.equal(buildRetailerEvidenceAudit({...candidate,source_url:'http://localhost'},'duplicate','2026-10-28T11:00:00Z').ok,false);
 assert.equal(buildRetailerEvidenceAudit(candidate,'published','2026-10-28T11:00:00Z').reason,'invalid_outcome');
 assert.equal(buildRetailerEvidenceAudit(candidate,'dry_run','not-a-date').reason,'invalid_timestamp');
});
