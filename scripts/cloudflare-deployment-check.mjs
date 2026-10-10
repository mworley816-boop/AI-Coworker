/**
 * Read-only Cloudflare Pages deployment diagnostics for Atlas.
 * Usage: CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_PAGES_PROJECT=... node scripts/cloudflare-deployment-check.mjs
 * Required token permission: Cloudflare Pages Read.
 * Never print credentials or raw response bodies.
 */
const required = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_PAGES_PROJECT'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error('Missing configuration: ' + missing.join(', '));
  process.exitCode = 2;
} else {
  const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_PAGES_PROJECT: project } = process.env;
  const url = 'https://api.cloudflare.com/client/v4/accounts/' + encodeURIComponent(account)
    + '/pages/projects/' + encodeURIComponent(project) + '/deployments?per_page=20';
  try {
    const response = await fetch(url, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.error('Cloudflare deployment lookup failed (HTTP ' + response.status + ').');
      process.exitCode = 1;
    } else {
      const payload = await response.json();
      if (!payload.success || !Array.isArray(payload.result)) {
        console.error('Cloudflare returned an unexpected deployment response.');
        process.exitCode = 1;
      } else {
        const deployments = payload.result
          .filter((item) => item.environment === 'production')
          .sort((a, b) => Date.parse(b.created_on || 0) - Date.parse(a.created_on || 0));
        const latest = deployments[0];
        if (!latest) {
          console.log(JSON.stringify({ project, status: 'unknown', reason: 'No production deployment in fetched page' }));
          process.exitCode = 1;
        } else {
          const stage = latest.latest_stage || {};
          const status = stage.status === 'success' ? 'success'
            : stage.status === 'failure' ? 'failure'
            : 'pending';
          console.log(JSON.stringify({
            project,
            environment: 'production',
            deployment_id: latest.id,
            created_on: latest.created_on,
            deployment_url: latest.url,
            stage: stage.name || null,
            status,
            commit_hash: latest.deployment_trigger?.metadata?.commit_hash || null,
          }, null, 2));
          if (status === 'failure') process.exitCode = 1;
        }
      }
    }
  } catch (error) {
    console.error('Cloudflare lookup unavailable: ' + (error?.name === 'TimeoutError' ? 'request timed out' : 'network or response error'));
    process.exitCode = 1;
  }
}
