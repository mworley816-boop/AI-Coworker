/**
 * Server-side Atlas -> Scentmarked retailer candidate transport.
 * This is an opt-in adapter, NOT the Cloudflare Worker entrypoint.
 * Never expose the shared secret in a browser or logs.
 */
export async function submitRetailerCandidate(candidate, env, options = {}) {
  const url = env?.SCENTMARKED_RETAILER_INTAKE_URL;
  const secret = env?.ATLAS_RETAILER_INTAKE_SECRET;
  if (typeof secret !== 'string' || secret.length < 32)
    return { ok: false, reason: 'missing_secret' };
  if (typeof url !== 'string')
    return { ok: false, reason: 'missing_url' };
  let endpoint;
  try {
    endpoint = new URL(url);
    if (endpoint.protocol !== 'https:' ||
        endpoint.hostname !== 'scentmarked.m-worley816.workers.dev' ||
        endpoint.pathname !== '/api/atlas/retailer-candidates' ||
        endpoint.search || endpoint.hash || endpoint.username || endpoint.password)
      return { ok: false, reason: 'untrusted_destination' };
  } catch { return { ok: false, reason: 'invalid_url' }; }
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    return { ok: false, reason: 'invalid_candidate' };
  const fetcher = options.fetch ?? globalThis.fetch;
  try {
    const response = await fetcher(endpoint.toString(), {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + secret, 'Content-Type': 'application/json' },
      body: JSON.stringify(candidate),
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 201) return { ok: true, status: 'draft_created' };
    if (response.status === 409) return { ok: false, reason: 'duplicate' };
    if (response.status === 401) return { ok: false, reason: 'unauthorized' };
    if (response.status === 422) return { ok: false, reason: 'validation_failed' };
    return { ok: false, reason: 'upstream_error', status: response.status };
  } catch { return { ok: false, reason: 'network_error' }; }
}
