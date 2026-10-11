/** Server-only scheduled GitHub Actions incident check; does not change code or deploy. */
import { runWorkflowIncidentSync } from './atlas-workflow-incident-sync.mjs';

export function createScheduledWorkflowIncidentSync({ owner, repo, token, repository, fetchImpl = fetch, maxRuns = 5 }) {
  if (typeof repository?.record !== 'function') throw new TypeError('Incident repository required');
  if (typeof token !== 'string' || !token.trim()) throw new TypeError('GitHub token required');
  return async function scheduledWorkflowIncidentSync() {
    return runWorkflowIncidentSync({ owner, repo, token, repository, fetchImpl, maxRuns });
  };
}

/** Compose without interrupting existing cron jobs. Report only sanitized errors. */
export function attachScheduledWorkflowIncidentSync(existingScheduled, options, { onError = () => {} } = {}) {
  if (typeof existingScheduled !== 'function') throw new TypeError('Scheduled handler required');
  if (typeof onError !== 'function') throw new TypeError('Error callback required');
  const check = createScheduledWorkflowIncidentSync(options);
  return async function scheduledWithWorkflowSync(event, env, ctx) {
    const results = await Promise.allSettled([
      Promise.resolve().then(() => existingScheduled(event, env, ctx)),
      Promise.resolve().then(check),
    ]);
    if (results[1].status === 'rejected') {
      try { onError({ component: 'github_workflow_incidents', reason: 'sync_failed' }); } catch {}
    } else if (results[1].value?.ok === false) {
      try { onError({ component: 'github_workflow_incidents', reason: 'provider_unavailable' }); } catch {}
    }
    if (results[0].status === 'rejected') throw results[0].reason;
    return results[0].value;
  };
}
