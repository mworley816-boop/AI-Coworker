/**
 * Server-only Atlas incident repository.
 * Pass a server-side Supabase client configured with a secret key.
 * Never import this module into a browser bundle.
 */
export function createIncidentRepository(supabase) {
  if (!supabase?.from) throw new TypeError('Supabase client required');
  const table = () => supabase.from('atlas_incidents');

  return {
    async list({ project = 'scentmarked', limit = 50 } = {}) {
      const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
      const { data, error } = await table()
        .select('id,project,fingerprint,source,environment,status,severity,observed_evidence,recommendation,approval_required,occurrences,first_seen_at,last_seen_at,notified_at')
        .eq('project', project)
        .order('last_seen_at', { ascending: false })
        .limit(safeLimit);
      if (error) throw error;
      return data ?? [];
    },

    async record(incident) {
      if (!incident || !incident.fingerprint || !incident.project || !incident.source) {
        throw new TypeError('Incident requires fingerprint, project and source');
      }
      // Database upsert is atomic for the unique project/fingerprint pair.
      // Occurrence increments and alert deduplication require a dedicated
      // transactional RPC; do not claim they are guaranteed by this method.
      const allowed = [
        'project', 'fingerprint', 'source', 'environment', 'status', 'severity',
        'observed_evidence', 'recommendation', 'approval_required',
      ];
      const payload = Object.fromEntries(allowed.filter((key) => incident[key] !== undefined)
        .map((key) => [key, incident[key]]));
      const { data, error } = await table().upsert(payload, { onConflict: 'project,fingerprint' }).select().single();
      if (error) throw error;
      return data;
    },
  };
}
