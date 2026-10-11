/** Persist sanitized workflow diagnostics as Scentmarked incidents.
 * Server-only: repository must be backed by an authorized Supabase client.
 */
export async function recordWorkflowDiagnostics({ report, repository }) {
  if (typeof repository?.record !== 'function') throw new TypeError('Incident repository required');
  if (report?.ok !== true || !Array.isArray(report.incidents)) throw new TypeError('Successful diagnostic report required');
  const recorded = [];
  for (const item of report.incidents) {
    if (!Number.isSafeInteger(item?.run_id) || item.run_id < 1) continue;
    const jobs = Array.isArray(item.failed_jobs) ? item.failed_jobs : [];
    const evidence = {
      run_id: item.run_id,
      workflow: String(item.workflow ?? 'Unknown').slice(0, 200),
      failed_jobs: jobs.slice(0, 20).map(job => ({
        id: job.id,
        name: String(job.name ?? 'Unknown').slice(0, 200),
        failed_steps: Array.isArray(job.failed_steps) ? job.failed_steps.slice(0, 20).map(step => ({ number: step.number, name: String(step.name ?? 'Unknown').slice(0, 200) })) : [],
      })),
      diagnostic_complete: item.diagnostic_complete === true,
    };
    const incident = {
      project: 'scentmarked',
      fingerprint: `github-actions:run:${item.run_id}`,
      source: 'github_actions',
      environment: 'production',
      status: 'confirmed',
      severity: 'warning',
      observed_evidence: evidence,
      recommendation: item.diagnostic_complete === true ? 'Review failed workflow jobs and propose a repair for approval.' : 'Review GitHub Actions diagnostics and verify permissions.',
      approval_required: true,
    };
    await repository.record(incident);
    recorded.push({ run_id: item.run_id, fingerprint: incident.fingerprint });
  }
  return { recorded_count: recorded.length, recorded };
}
