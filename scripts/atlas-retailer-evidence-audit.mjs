import {validateResearchEvidence} from './atlas-retailer-research-flow.mjs';

// Produce a minimal, serializable review record without credentials, response
// bodies, or customer information. This module does not persist or publish.
export function buildRetailerEvidenceAudit(candidate, outcome, observedAt) {
  const reason=validateResearchEvidence(candidate);
  if(reason) return {ok:false,reason};
  if(!['dry_run','draft_created','duplicate'].includes(outcome))
    return {ok:false,reason:'invalid_outcome'};
  if(typeof observedAt!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(observedAt) || !Number.isFinite(Date.parse(observedAt)))
    return {ok:false,reason:'invalid_timestamp'};
  return {ok:true,record:{
    perfume_id:candidate.perfume_id,
    brand:candidate.brand.trim(),
    perfume_name:candidate.perfume_name.trim(),
    merchant_name:candidate.merchant_name.trim(),
    product_url:candidate.product_url,
    source_url:candidate.source_url,
    evidence_note:candidate.evidence_note.trim(),
    observed_at:observedAt,
    outcome,
    published:false,
    requires_admin_approval:true
  }};
}
