/** Server-only orchestration: discover failures and persist safe incident summaries. */
import { diagnoseRecentWorkflowFailures } from './atlas-workflow-diagnostics.mjs';
import { recordWorkflowDiagnostics } from './atlas-workflow-incident-writer.mjs';

export async function runWorkflowIncidentSync({ owner, repo, token, repository, fetchImpl = fetch, maxRuns = 5 }) {
  if (typeof repository?.record !== 'function') throw new TypeError('Incident repository required');
  const diagnostics = await diagnoseRecentWorkflowFailures({ owner, repo, token, fetchImpl, maxRuns });
  if (!diagnostics.ok) return { ok: false, stage: diagnostics.stage, http_status: diagnostics.http_status, recorded_count: 0 };
  const persisted = await recordWorkflowDiagnostics({ report: diagnostics, repository });
  return { ok: true, ...persisted };
}
