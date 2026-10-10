/**
 * Read-only dashboard data adapter. Server-side use only.
 * The caller must authenticate and authorize the Atlas administrator first.
 */
export function createMaintenanceDashboard(repository) {
  if (!repository?.list) throw new TypeError('Incident repository required');

  return async function getDashboard({ project = 'scentmarked', limit = 50 } = {}) {
    if (typeof project !== 'string' || !/^[a-z0-9_-]{1,64}$/.test(project)) {
      throw new TypeError('Invalid project');
    }
    const incidents = await repository.list({ project, limit });
    const counts = { critical: 0, warning: 0, informational: 0 };
    for (const incident of incidents) {
      if (incident.status === 'confirmed' && Object.hasOwn(counts, incident.severity)) {
        counts[incident.severity] += 1;
      }
    }
    return {
      project,
      fetched_at: new Date().toISOString(),
      summary: { confirmed_incidents_in_page: counts, displayed: incidents.length },
      incidents: incidents.map((item) => ({
        id: item.id,
        project: item.project,
        source: item.source,
        environment: item.environment,
        status: item.status,
        severity: item.severity,
        recommendation: item.recommendation,
        approval_required: item.approval_required,
        occurrences: item.occurrences,
        first_seen_at: item.first_seen_at,
        last_seen_at: item.last_seen_at,
      })),
    };
  };
}
