/**
 * Fetch failed GitHub Actions job metadata without downloading raw logs.
 * Raw logs can contain sensitive material; do not store or return them here.
 */
export async function getFailedWorkflowJobs({ owner, repo, runId, token, fetchImpl = fetch }) {
  if (![owner, repo].every(v => typeof v === 'string' && /^[A-Za-z0-9_.-]+$/.test(v))) throw new TypeError('Invalid repository');
  if (!Number.isSafeInteger(runId) || runId < 1) throw new TypeError('Invalid workflow run ID');
  if (typeof token !== 'string' || !token.trim()) throw new TypeError('Server-side GitHub token required');
  const jobs = [];
  let page = 1;
  while (page <= 5) {
    const endpoint = new URL(`https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs`);
    endpoint.searchParams.set('per_page', '100');
    endpoint.searchParams.set('page', String(page));
    const response = await fetchImpl(endpoint, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return { ok: false, http_status: response.status, jobs: [] };
    const payload = await response.json();
    if (!Array.isArray(payload?.jobs)) throw new TypeError('Unexpected GitHub jobs response');
    for (const job of payload.jobs) {
      if (job?.conclusion !== 'failure') continue;
      jobs.push({
        id: job.id,
        name: typeof job.name === 'string' ? job.name.slice(0, 200) : 'Unnamed job',
        failed_steps: Array.isArray(job.steps) ? job.steps.filter(s => s?.conclusion === 'failure').map(s => ({ number: s.number, name: typeof s.name === 'string' ? s.name.slice(0, 200) : 'Unnamed step' })) : [],
      });
    }
    if (payload.jobs.length < 100) return { ok: true, jobs, truncated: false };
    page++;
  }
  return { ok: true, jobs, truncated: true };
}
