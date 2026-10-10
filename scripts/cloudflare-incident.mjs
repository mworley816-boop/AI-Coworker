/**
 * Pure adapter for Atlas's Cloudflare Pages deployment diagnostics.
 * Deployment success does not prove site recovery; HTTP verification is separate.
 */
export function deploymentToIncident(deployment, project = 'scentmarked') {
  if (!deployment || typeof deployment !== 'object') throw new TypeError('deployment required');
  const stage = deployment.latest_stage ?? {};
  const rawStatus = stage.status ?? 'unknown';
  const status = rawStatus === 'failure' ? 'confirmed' : rawStatus === 'success' ? 'deployment_succeeded' : 'investigating';
  const id = String(deployment.id ?? 'unknown');
  const environment = deployment.environment ?? 'unknown';
  const commit = deployment.deployment_trigger?.metadata?.commit_hash ?? null;
  return {
    incident_id: 'cloudflare-deployment:' + project + ':' + id,
    project,
    source: 'cloudflare_deployments',
    environment,
    status,
    severity: rawStatus === 'failure' && environment === 'production' ? 'critical' : rawStatus === 'failure' ? 'warning' : 'informational',
    fingerprint: [project, environment, 'deployment', id].join(':'),
    detected_at: new Date().toISOString(),
    observed_evidence: {
      deployment_id: id,
      deployment_url: deployment.url ?? null,
      created_on: deployment.created_on ?? null,
      stage: stage.name ?? null,
      stage_status: rawStatus,
      commit_hash: commit,
    },
    recommendation: rawStatus === 'failure'
      ? 'Review Cloudflare build logs and the matching GitHub commit before proposing a fix.'
      : rawStatus === 'success'
        ? 'Verify production HTTP health before closing any existing outage.'
        : 'Wait for a final deployment result and recheck.',
    approval_required: true,
  };
}
