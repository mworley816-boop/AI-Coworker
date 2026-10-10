/**
 * One iteration of Atlas's scheduled Scentmarked HTTP maintenance.
 * Call only from a trusted server-side scheduled job with a configured URL
 * and a service-role-backed incident repository.
 * No repair actions, notifications, or deployments are performed.
 */
import { checkHttpHealth } from './atlas-http-health.mjs';
import { httpHealthToIncident } from './atlas-http-health-incident.mjs';

export function createScheduledHttpMaintenance({ repository, healthUrl, fetchImpl = fetch }) {
  if (typeof repository?.record !== 'function') throw new TypeError('Incident repository required');
  const url = new URL(healthUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new TypeError('Trusted HTTPS health URL required');
  }
  return async function runScheduledHttpMaintenance() {
    const health = await checkHttpHealth(url.toString(), { fetchImpl });
    const incident = httpHealthToIncident(health);
    const recorded = await repository.record(incident);
    return {
      project: incident.project,
      status: incident.status,
      severity: incident.severity,
      healthy: health.healthy,
      http_status: health.http_status,
      recorded: Boolean(recorded),
    };
  };
}
