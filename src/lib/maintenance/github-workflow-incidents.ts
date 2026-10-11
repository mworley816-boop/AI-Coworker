/**
 * Read-only GitHub Actions failure lookup for Atlas maintenance.
 * Server-side only. Never return the token or raw job logs.
 */
export type FailedStep = {number: number; name: string};
export type FailedJob = {id: number; name: string; failedSteps: FailedStep[]};
export type WorkflowIncident = {runId: number; workflow: string; url: string | null; jobs: FailedJob[]; approvalRequired: true};

export async function inspectFailedScentmarkedRuns({
  owner, repo, token, maxRuns = 5, fetchImpl = fetch,
}: {owner: string; repo: string; token: string; maxRuns?: number; fetchImpl?: typeof fetch}): Promise<WorkflowIncident[]> {
  if (![owner, repo].every(v => /^[A-Za-z0-9_.-]+$/.test(v))) throw new TypeError("Invalid repository");
  if (!token?.trim()) throw new TypeError("GitHub token required");
  if (!Number.isInteger(maxRuns) || maxRuns < 1 || maxRuns > 20) throw new RangeError("Invalid run limit");
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28"};
  async function request(url: string): Promise<unknown> {
    const response = await fetchImpl(url, {headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error(`GitHub diagnostics unavailable (HTTP ${response.status})`);
    return response.json();
  }
  const runsPayload = await request(`${base}/actions/runs?status=failure&per_page=${maxRuns}`) as {workflow_runs?: unknown};
  if (!Array.isArray(runsPayload?.workflow_runs)) throw new Error("Invalid GitHub workflow response");
  const incidents: WorkflowIncident[] = [];
  for (const run of runsPayload.workflow_runs.slice(0, maxRuns) as Array<Record<string, unknown>>) {
    if (run.conclusion !== "failure" || !Number.isSafeInteger(run.id) || Number(run.id) < 1) continue;
    const runId = Number(run.id);
    const jobsPayload = await request(`${base}/actions/runs/${runId}/jobs?per_page=100`) as {jobs?: unknown};
    if (!Array.isArray(jobsPayload?.jobs)) throw new Error("Invalid GitHub jobs response");
    const jobs: FailedJob[] = (jobsPayload.jobs as Array<Record<string, unknown>>)
      .filter(job => job.conclusion === "failure" && Number.isSafeInteger(job.id))
      .map(job => ({
        id: Number(job.id),
        name: String(job.name ?? "Unnamed job").slice(0, 160),
        failedSteps: (Array.isArray(job.steps) ? job.steps : [])
          .filter((step: Record<string, unknown>) => step.conclusion === "failure")
          .map((step: Record<string, unknown>) => ({number: Number(step.number) || 0, name: String(step.name ?? "Unnamed step").slice(0, 160)})),
      }));
    const url = `https://github.com/${owner}/${repo}/actions/runs/${runId}`;
    incidents.push({runId, workflow: String(run.name ?? "Unnamed workflow").slice(0, 160), url, jobs, approvalRequired: true});
  }
  return incidents;
}

/** Convert read-only diagnostics into a sanitized maintenance status. */
export function summarizeWorkflowIncidents(incidents: WorkflowIncident[]) {
  const failedRuns = incidents.length;
  return {
    id: "github_actions" as const,
    label: "Scentmarked GitHub Actions",
    status: failedRuns > 0 ? "warning" as const : "healthy" as const,
    incidents: incidents.map(({runId,workflow,url,jobs})=>({runId,workflow,url,jobs})),
    detail: failedRuns > 0
      ? `${failedRuns} failed workflow run(s) detected. Review before any repair.`
      : "No failed workflow runs returned by the current GitHub query.",
  };
}
