/**
 * Pure incident-history reducer for Atlas.
 * Persistence must be supplied by the workspace; this module does not write data.
 * A deployment succeeding does not resolve a website outage.
 */
export function mergeIncidentHistory(history, incoming, now = new Date().toISOString()) {
  if (!Array.isArray(history)) throw new TypeError('history must be an array');
  if (!incoming || typeof incoming !== 'object' || !incoming.fingerprint) {
    throw new TypeError('incoming incident must have a fingerprint');
  }
  const index = history.findIndex((item) => item.fingerprint === incoming.fingerprint);
  if (index === -1) {
    const record = { ...incoming, first_seen_at: now, last_seen_at: now, occurrences: 1, notified_at: null };
    return { history: [...history, record], change: 'new', should_notify: incoming.status === 'confirmed' };
  }
  const existing = history[index];
  const escalation = incoming.status === 'confirmed' &&
    (existing.status !== 'confirmed' || (existing.severity !== 'critical' && incoming.severity === 'critical'));
  const updated = {
    ...existing,
    ...incoming,
    first_seen_at: existing.first_seen_at,
    last_seen_at: now,
    occurrences: (existing.occurrences ?? 1) + 1,
    notified_at: escalation ? null : (existing.notified_at ?? null),
  };
  const next = history.slice();
  next[index] = updated;
  return { history: next, change: escalation ? 'escalated' : 'updated', should_notify: escalation };
}

export function filterIncidents(history, { project, status, severity, environment } = {}) {
  if (!Array.isArray(history)) throw new TypeError('history must be an array');
  return history.filter((incident) =>
    (!project || incident.project === project) &&
    (!status || incident.status === status) &&
    (!severity || incident.severity === severity) &&
    (!environment || incident.environment === environment)
  );
}
