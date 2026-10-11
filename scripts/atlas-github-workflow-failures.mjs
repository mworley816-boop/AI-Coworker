/** Read-only GitHub Actions workflow failure discovery.
 * Use a trusted server-side GitHub token; never send it to a browser.
 */
import { classifyBuildFailure } from './atlas-build-failure-classifier.mjs';

export async function discoverFailedWorkflowRuns({ owner, repo, token, fetchImpl = fetch, perPage = 20 }) {
  if (![owner, repo].every(v => typeof v === 'string' && /^[A-Za-z0-9_.-]+$/.test(v))) throw new TypeError('Invalid repository');
  if (typeof token !== 'string' || !token.trim()) throw new TypeError('Server-side GitHub token required');
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) throw new RangeError('Invalid page size');
  const endpoint = new URL(`https://api.github.com/repos/${owner}/${repo}/actions/runs`);
  endpoint.searchParams.set('status', 'failure');
  endpoint.searchParams.set('per_page', String(perPage));
  const response = await fetchImpl(endpoint, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return { ok: false, http_status: response.status, runs: [] };
  const payload = await response.json();
  if (!Array.isArray(payload?.workflow_runs)) throw new TypeError('Unexpected GitHub response');
  return {
    ok: true,
    runs: payload.workflow_runs.filter(run => run?.conclusion === 'failure').map(run => ({
      id: run.id,
      name: typeof run.name === 'string' ? run.name : 'Unnamed workflow',
      created_at: run.created_at ?? null,
      html_url: typeof run.html_url === 'string' && run.html_url.startsWith(`https://github.com/${owner}/${repo}/actions/runs/`) ? run.html_url : null,
      diagnosis: classifyBuildFailure({ conclusion: 'failure' }),
    })),
  };
}
