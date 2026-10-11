/** Compose read-only GitHub Actions diagnostics for Atlas. No code changes or log downloads. */
import { discoverFailedWorkflowRuns } from './atlas-github-workflow-failures.mjs';
import { getFailedWorkflowJobs } from './atlas-github-failed-jobs.mjs';

export async function diagnoseRecentWorkflowFailures({ owner, repo, token, fetchImpl = fetch, maxRuns = 5 }) {
  if (!Number.isInteger(maxRuns) || maxRuns < 1 || maxRuns > 20) throw new RangeError('Invalid run limit');
  const discovered = await discoverFailedWorkflowRuns({ owner, repo, token, fetchImpl, perPage: maxRuns });
  if (!discovered.ok) return { ok: false, stage: 'runs', http_status: discovered.http_status, incidents: [] };
  const incidents = [];
  for (const run of discovered.runs.slice(0, maxRuns)) {
    if (!Number.isSafeInteger(run.id) || run.id < 1) continue;
    const details = await getFailedWorkflowJobs({ owner, repo, token, runId: run.id, fetchImpl });
    incidents.push({
      run_id: run.id,
      workflow: run.name,
      created_at: run.created_at,
      run_url: run.html_url,
      status: 'confirmed',
      severity: 'warning',
      category: 'build_failure',
      recommendation: details.ok ? 'Review failed jobs and steps before proposing a repair.' : 'Unable to retrieve failed job details; verify GitHub permissions.',
      approval_required: true,
      diagnostic_complete: details.ok && !details.truncated,
      failed_jobs: details.ok ? details.jobs : [],
    });
  }
  return { ok: true, incidents };
}
