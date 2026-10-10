/**
 * Converts independent HTTP health results to a persisted Atlas incident.
 * Deployment success must never auto-resolve a health outage.
 */
export function httpHealthToIncident(health, { project = 'scentmarked', environment = 'production' } = {}) {
  if (!health || typeof health !== 'object' || typeof health.healthy !== 'boolean') {
    throw new TypeError('Health check result required');
  }
  if (typeof project !== 'string' || !/^[a-z0-9_-]{1,64}$/.test(project)) {
    throw new TypeError('Invalid project');
  }
  if (typeof environment !== 'string' || !/^[a-z0-9_-]{1,64}$/.test(environment)) {
    throw new TypeError('Invalid environment');
  }
  const healthy = health.healthy;
  return {
    project,
    fingerprint: [project, environment, 'http-health'].join(':'),
    source: 'http_health',
    environment,
    status: healthy ? 'resolved' : 'confirmed',
    severity: healthy ? 'informational' : environment === 'production' ? 'critical' : 'warning',
    observed_evidence: {
      checked_at: health.checked_at ?? null,
      http_status: Number.isInteger(health.http_status) ? health.http_status : null,
      reason: health.reason ?? null,
    },
    recommendation: healthy
      ? 'HTTP endpoint responded successfully; verify application functionality separately.'
      : 'Investigate HTTP availability and Cloudflare deployment logs before proposing changes.',
    approval_required: true,
  };
}
