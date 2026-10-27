import { submitRetailerCandidate } from './atlas-retailer-submission.mjs';

// Research is supplied by a trusted, separately reviewed source. Never scrape
// arbitrary URLs or treat a search result as verified bottle identity.
export function validateResearchEvidence(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return 'invalid_candidate';
  if (typeof candidate.perfume_id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(candidate.perfume_id)) return 'invalid_perfume_id';
  for (const key of ['brand', 'perfume_name', 'merchant_name', 'evidence_note']) {
    if (typeof candidate[key] !== 'string' || !candidate[key].trim() || candidate[key].length > 500) return 'missing_' + key;
  }
  for (const key of ['product_url', 'source_url']) {
    if (typeof candidate[key] !== 'string' || candidate[key].length > 2048) return 'invalid_' + key;
    try {
      const url = new URL(candidate[key]);
      if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') ||
          url.hostname.endsWith('.local') || url.hostname === 'localhost' ||
          /^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(url.hostname) || url.hostname.includes(':'))
        return 'invalid_' + key;
    } catch { return 'invalid_' + key; }
  }
  if (candidate.bottle_size_ml != null && (!Number.isFinite(candidate.bottle_size_ml) || candidate.bottle_size_ml <= 0 || candidate.bottle_size_ml > 1000)) return 'invalid_bottle_size';
  if (candidate.concentration != null && (typeof candidate.concentration !== 'string' || candidate.concentration.length > 100)) return 'invalid_concentration';
  return null;
}

// Safe by default: this NEVER submits unless explicitly enabled by the caller.
// Submission creates an INACTIVE offer; a Scentmarked admin must publish it.
export async function runRetailerResearchToDraft({ research, env = {}, submit = submitRetailerCandidate, allowSubmission = false } = {}) {
  if (typeof research !== 'function') return { ok: false, reason: 'missing_research_provider' };
  let candidate;
  try { candidate = await research(); }
  catch { return { ok: false, reason: 'research_failed' }; }
  const reason = validateResearchEvidence(candidate);
  if (reason) return { ok: false, reason };
  if (!allowSubmission) return { ok: true, status: 'dry_run', published: false, candidate };
  const result = await submit(candidate, env);
  return { ...result, published: false };
}
